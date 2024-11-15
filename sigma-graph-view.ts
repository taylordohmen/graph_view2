import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import Graph from 'graphology';
import { circlepack, circular, random } from 'graphology-layout';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import NoverlapLayout from 'graphology-layout-noverlap/worker';
import louvain from 'graphology-communities-louvain';
import * as gexf from 'graphology-gexf';
import Sigma from 'sigma';
import { animateNodes } from 'sigma/utils';
import { fitViewportToNodes } from '@sigma/utils';
import iwanthue from 'iwanthue';

export const VIEW_TYPE_SIGMA = 'sigma-graph-view';

// Custom View class for the graph
export class SigmaGraphView extends ItemView {
	private container: HTMLElement;
	private graph: Graph;
	private renderer: Sigma;
	private cancelCurrentAnimation: (() => void) | null;
	private fa2Layout: FA2Layout;
	private noverlapLayout: NoverlapLayout;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.navigation = true;
		this.container = this.contentEl.createDiv({
			cls: 'sigma-graph-container'
		});

		this.cancelCurrentAnimation = null;
		this.register(() => console.log('unloading sigma graph view.'));
	}

	getViewType(): string {
		return VIEW_TYPE_SIGMA;
	}

	getDisplayText(): string {
		return 'Sigma Graph View';
	}

	async onOpen(): Promise<void> {
		// Build the graph
		await this.buildGraphData();
		// Render the graph
		await this.renderGraph();
		// define event listeners for hover behavior
		await this.enableHoverEffects();

		await this.enableRightClick();

		const sensibleSettings = forceAtlas2.inferSettings(this.graph);
		this.fa2Layout = new FA2Layout(this.graph, {
			settings: sensibleSettings
		});
		this.noverlapLayout = new NoverlapLayout(this.graph);
	}

	async onClose(): Promise<void> {
		if (this.fa2Layout) {
			this.fa2Layout.kill();
		}
		if (this.noverlapLayout) {
			this.noverlapLayout.kill();
		}
		if (this.renderer) {
			this.renderer.kill();
		}
	}

	private async buildGraphData(): Promise<void> {
		this.graph = new Graph({ type: 'undirected' });

		const files = this.app.vault.getMarkdownFiles();

		// Add nodes for each file
		for (const file of files) {
			this.graph.addNode(file.path, {
				label: file.basename,
				size: 1,
				nonpaper: file.parent?.name === 'People' || file.parent?.name === file.basename
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

	private updateNodeAttributes(node: string): void {
		if (this.graph.getNodeAttribute(node, 'nonpaper')) {
			this.graph.updateNodeAttribute(node, 'size', (n) => n + 1 / n ** 2);
		}
	}

	private async renderGraph(): Promise<void> {
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
		const communities = new Set<string>();
		this.graph.forEachNode((_, attrs) => communities.add(attrs.community));
		const communitiesArray = Array.from(communities);

		// Determine colors, and color each node accordingly
		const palette: Record<string, string> = iwanthue(communities.size).reduce((iter, color, i) => ({ ...iter, [communitiesArray[i]]: color }), {});
		this.graph.forEachNode((node, attr) => this.graph.setNodeAttribute(node, 'color', palette[attr.community]));

		// assign an (x, y) coordinate each node that respects the louvain communties
		circlepack.assign(this.graph, { hierarchyAttributes: ['community'] });

		// Configure and initialize Sigma renderer
		this.renderer = new Sigma(this.graph, this.container, {
			allowInvalidContainer: true,
			renderEdgeLabels: false,
			renderLabels: false,
			minCameraRatio: 0.01,
			maxCameraRatio: 100,
			// This function tells sigma to grow sizes linearly with the zoom, instead of relatively to the zoom ratio's square root:
			// zoomToSizeRatioFunction: (x) => x,
			// If set to false, this disables the default sigma rescaling, so that by default, positions and sizes are preserved on screen (in pixels):
			autoRescale: false,
			// This flag tells sigma to disable the nodes and edges sizes interpolation and instead scales them in the same way it handles positions:
			itemSizesReference: 'positions'
		});
	}

	private async enableHoverEffects(): Promise<void> {
		this.renderer.on('enterNode', ({ node }) => {
			this.graph.setNodeAttribute(node, 'highlighted', true);
			if (this.graph.getNodeAttribute(node, 'nonpaper')) {
				this.graph.forEachNeighbor(node, (neighbor) => {
					if (this.graph.getNodeAttribute(neighbor, 'nonpaper')) {
						this.graph.setNodeAttribute(neighbor, 'highlighted', true);
					}
				});
			}
		});

		this.renderer.on('leaveNode', ({ node }) => {
			this.graph.setNodeAttribute(node, 'highlighted', false);
			if (this.graph.getNodeAttribute(node, 'nonpaper')) {
				this.graph.forEachNeighbor(node, (neighbor) => {
					if (this.graph.getNodeAttribute(neighbor, 'nonpaper')) {
						this.graph.setNodeAttribute(neighbor, 'highlighted', false);
					}
				});
			}
		});
	}

	private async enableRightClick(): Promise<void> {
		this.renderer.on('rightClickNode', async ({ node }) => {
			const newTab: WorkspaceLeaf = this.app.workspace.getLeaf('tab');
			const nodeFile: TFile = this.app.vault.getFileByPath(node);
			await newTab.openFile(nodeFile);
		});
	}

	public fitToView(): void {
		fitViewportToNodes(this.renderer, this.graph.nodes());
	}

	public gexfString(): string {
		return gexf.write(this.graph);
	}

	public circularLayout(): void {
		if (this.cancelCurrentAnimation) {
			this.cancelCurrentAnimation();
		}
		//since we want to use animations we need to process positions before applying them through animateNodes
		const circularPositions = circular(this.graph, { scale: 500 });
		//In other context, it's possible to apply the position directly we : circular.assign(graph, {scale:100})
		this.cancelCurrentAnimation = animateNodes(this.graph, circularPositions, { duration: 2000, easing: 'linear' });
	}

	public randomLayout(): void {
		if (this.cancelCurrentAnimation) {
			this.cancelCurrentAnimation();
		}
		//since we want to use animations we need to process positions before applying them through animateNodes
		const randomPositions = random(this.graph, { scale: 1000 });
		this.cancelCurrentAnimation = animateNodes(this.graph, randomPositions, { duration: 2000, easing: 'linear' });
	}

	public circlepackLayout(): void {
		if (this.cancelCurrentAnimation) {
			this.cancelCurrentAnimation();
		}
		//since we want to use animations we need to process positions before applying them through animateNodes
		const circlepackPositions = circlepack(this.graph, {
			hierarchyAttributes: ['community']
		});
		this.cancelCurrentAnimation = animateNodes(this.graph, circlepackPositions, { duration: 2000, easing: 'linear' });
	}

	public toggleFA2Layout(): void {
		if (this.fa2Layout.isRunning()) {
			this.fa2Layout.stop();
		} else {
			if (this.cancelCurrentAnimation) {
				this.cancelCurrentAnimation();
			}
			this.fa2Layout.start();
		}
	}

	public async toggleNoverlapLayout(): void {
		if (this.noverlapLayout.isRunning()) {
			this.noverlapLayout.stop();
		} else {
			if (this.cancelCurrentAnimation) {
				this.cancelCurrentAnimation();
			}
			this.noverlapLayout.start();
		}
	}
}
