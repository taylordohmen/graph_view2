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
                    } catch (e) {
                        // Handle cases where the edge already exists
                        console.debug('Edge already exists', e);
                    }
                    this.updateNodeAttributes(file.path);
                    this.updateNodeAttributes(targetFile.path);
                }
            }
        }
    }

    private updateNodeAttributes(node: string) {
        if (this.graph.getNodeAttribute(node, 'person')) {
            this.graph.updateNodeAttribute(node, 'size', n => n + 1/n**2);
        }
        else if (node.contains('People/')) {
            this.graph.setNodeAttribute(node, 'person', true);
            this.graph.updateNodeAttribute(node, 'size', n => n + 1/n**2);
        } else {
            this.graph.setNodeAttribute(node, 'person', false);
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

        // compute communities and assign one to each node as an attribute
        louvain.assign(this.graph);

        // assign an (x, y) coordinate each node that respects the louvain communties
        circlepack.assign(this.graph, { hierarchyAttributes: ['community'] })

        // Configure and initialize Sigma renderer
        this.renderer = new Sigma(this.graph, this.container, {
            renderEdgeLabels: false,
            defaultNodeColor: '#67B7D1',
            defaultEdgeColor: '#bababa',
            // defaultNodeSize: 10,
            minCameraRatio: 0.01,
            maxCameraRatio: 100,
            // This function tells sigma to grow sizes linearly with the zoom, instead of relatively to the zoom ratio's square root:
            // zoomToSizeRatioFunction: (x) => x,
            // If set to false, this disables the default sigma rescaling, so that by default, positions and sizes are preserved on screen (in pixels):
            autoRescale: false,
            // This flag tells sigma to disable the nodes and edges sizes interpolation and instead scales them in the same way it handles positions:
            itemSizesReference: "positions"
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