import { ItemView, WorkspaceLeaf } from 'obsidian';
import Graph from 'graphology';
import { random, circular, circlepack } from 'graphology-layout';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import NoverlapLayout from 'graphology-layout-noverlap/worker';
import louvain from 'graphology-communities-louvain';
import Sigma from 'sigma';

export const VIEW_TYPE_SIGMA = 'sigma-graph-view';

// Custom View class for the graph
export class SigmaGraphView extends ItemView {
    private container: HTMLElement;
    private graph: Graph;
    private renderer: Sigma;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.container = this.contentEl.createDiv({ cls: 'sigma-graph-container' });
    }

    getViewType(): string {
        return VIEW_TYPE_SIGMA;
    }

    getDisplayText(): string {
        return 'Sigma Graph View';
    }

    async onOpen() {
        // Initialize the graph
        this.initializeGraph();
        // Build the graph data
        await this.buildGraphData();
        // Render the graph
        await this.renderGraph();
    }

    async onClose() {
        if (this.renderer) {
            this.renderer.kill();
        }
    }

    private initializeGraph() {
        this.graph = new Graph({ type: 'undirected' });
    }

    private async buildGraphData() {
        const files = this.app.vault.getMarkdownFiles();

        // Add nodes for each file
        for (const file of files) {
            this.graph.addNode(file.path, {
                label: file.basename,
                size: 1,
                color: file.parent?.name === 'People' ? '#67B7D1' : '#bababa'
            });
        }

        // Add edges based on links between files
        for (const file of files) {
            const links = this.app.metadataCache.getFileCache(file)?.links || [];
            for (const link of links) {
                const targetFile = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
                if (targetFile) {
                    try {
                        this.graph.addEdge(file.path, targetFile.path, {
                            weight: 1,
                            color: '#bababa'
                        });

                        if (this.graph.getNodeAttribute(file.path, 'person')) {
                            this.graph.updateNodeAttribute(file.path, 'size', n => n + 1/n);
                        }
                        else if (file.path.contains('People/')) {
                            this.graph.setNodeAttribute(file.path, 'person', true);
                            this.graph.updateNodeAttribute(file.path, 'size', n => n + 1/n);
                        } else {
                            this.graph.setNodeAttribute(file.path, 'person', false);
                        }

                        if (this.graph.getNodeAttribute(targetFile.path, 'person')) {
                            this.graph.updateNodeAttribute(targetFile.path, 'size', n => n + 1/n);
                        } else if (targetFile.path.contains('People/')) {
                            this.graph.setNodeAttribute(targetFile.path, 'person', true);
                            this.graph.updateNodeAttribute(targetFile.path, 'size', n => n + 1/n);
                        } else {
                            this.graph.setNodeAttribute(targetFile.path, 'person', false);
                        }

                    } catch (e) {
                        // Handle cases where the edge already exists
                        console.debug('Edge already exists', e);
                    }
                }
            }
        }
    }

    private async renderGraph() {
        // Clear the container
        this.container.empty();

        // specify container dimensions and other properties
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';

        louvain.assign(this.graph);

        console.log(louvain.detailed(this.graph))

        // assign random positions to the nodes
        circlepack.assign(this.graph, { hierarchyAttributes: ['community'], scale: 0.25 })
        // const fa2settings = forceAtlas2.inferSettings(this.graph);
        // const layout = new FA2Layout(this.graph, { settings: fa2settings });
        // const layout = new NoverlapLayout(this.graph);

        // console.log('STARTING LAYOUT');
        // layout.start()

        // Configure and initialize Sigma renderer
        this.renderer = new Sigma(this.graph, this.container, {
            renderEdgeLabels: false,
            defaultNodeColor: '#67B7D1',
            defaultEdgeColor: '#bababa',
            // defaultNodeSize: 10,
            minCameraRatio: 0.01,
            maxCameraRatio: 100,
        });

        // Add interactivity
        // this.renderer.on('clickNode', ({ node }) => {
        //     const file = this.app.vault.getAbstractFileByPath(node);
        //     if (file instanceof TFile) {
        //         this.app.workspace.activeLeaf.openFile(file);
        //     }
        // });

        // Add hover effects
        this.renderer.on('enterNode', ({ node }) => {
            this.graph.setNodeAttribute(node, 'highlighted', true);
            if (this.graph.getNodeAttribute(node, 'person')) {
                this.graph.forEachNeighbor(
                    node,
                    (neighbor) => {
                        if (this.graph.getNodeAttribute(neighbor, 'person')) {
                            this.graph.setNodeAttribute(neighbor, 'highlighted', true);
                            this.graph.setEdgeAttribute(node, neighbor, 'highlighted', true);
                        }
                    }
                );
            }
            
        });

        this.renderer.on('leaveNode', ({ node }) => {
            this.graph.setNodeAttribute(node, 'highlighted', false);
            if (this.graph.getNodeAttribute(node, 'person')) {
                this.graph.forEachNeighbor(
                    node,
                    (neighbor) => {
                        if (this.graph.getNodeAttribute(neighbor, 'person')) {
                            this.graph.setNodeAttribute(neighbor, 'highlighted', false);
                            this.graph.setEdgeAttribute(node, neighbor, 'highlighted', false);
                        }
                    }
                );
            }
        });
    }
}