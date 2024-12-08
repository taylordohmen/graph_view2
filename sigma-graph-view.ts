import { ButtonComponent, DropdownComponent, ItemView, SearchComponent, TFile, WorkspaceLeaf } from 'obsidian';
import Graph from 'graphology';
import { circlepack, circular, random } from 'graphology-layout';
import louvain from 'graphology-communities-louvain';
import * as gexf from 'graphology-gexf';
import Sigma from 'sigma';
import { animateNodes } from 'sigma/utils';
import { fitViewportToNodes } from '@sigma/utils';
import iwanthue from 'iwanthue';

export const VIEW_TYPE_SIGMA = 'sigma-graph-view';

// Custom View class for the graph
export class SigmaGraphView extends ItemView {
	private graphContainer: HTMLElement;
	private controlsContainer: HTMLElement;
	private graph: Graph;
	private renderer: Sigma;
	private cancelCurrentAnimation: (() => void) | null;
	private searchBar: SearchComponent;
	private layoutControls: DropdownComponent;
	private redrawButton: ButtonComponent;
	private fitButton: ButonComponent;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.navigation = true;
		this.graphContainer = this.contentEl.createDiv({
			cls: 'sigma-graph-container'
		});
		this.controlsContainer = this.contentEl.createDiv({
			cls: 'sigma-controls-container'
		});
		this.cancelCurrentAnimation = null;
	}

	getViewType(): string {
		return VIEW_TYPE_SIGMA;
	}

	getDisplayText(): string {
		return 'Sigma Graph View';
	}

	async onOpen(): Promise<void> {
		// Build the graph
		await this.buildGraph();

		// Render the graph
		await this.renderGraph();

		// define event listeners for hover behavior
		await this.enableHoverEffects();

		// Define event listeners for opening the corresponding note when right-clicking a node
		await this.enableRightClick();

		await this.configureControls();
	}

	async onClose(): Promise<void> {
		if (this.renderer) {
			this.renderer.kill();
		}
	}

	private async buildGraph(): Promise<void> {
		this.graph = new Graph({ type: 'undirected' });

		const files = this.app.vault.getMarkdownFiles();

		// Add nodes for each file
		for (const file of files) {
			const name: string = file.basename;
			const conference: boolean = name === name.toUpperCase() && /^[A-Z]+$/.test(name);
			const person: boolean = file.parent?.name === 'People';
			const fileCache = this.app.metadataCache.getFileCache(file);
			const journal: boolean = fileCache.frontmatter && 'journal' in fileCache.frontmatter;

			this.graph.addNode(file.path, {
				label: name,
				size: 1,
				person: person,
				conference: conference,
				journal: journal
				// highlighted: conference || journal
			});
		}

		// Add edges based on links between files
		for (const file of files) {
			const links = this.app.metadataCache.getFileCache(file)?.links || [];
			for (const link of links) {
				const targetFile = this.app.metadataCache.getFirstLinkpathDest(
					link.link,
					file.path
				);
				if (targetFile) {
					try {
						this.graph.addEdge(file.path, targetFile.path, {
							weight: 1,
							color: '#00000000'
							// color: '#bababa'
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
		const conference: boolean = this.graph.getNodeAttribute(node, 'conference');
		const journal: boolean = this.graph.getNodeAttribute(node, 'journal');
		const person: boolean = this.graph.getNodeAttribute(node, 'person');
		if (conference || journal || person) {
			this.graph.updateNodeAttribute(node, 'size', (n) => n + 1 / n ** 2);
		}
	}

	private async renderGraph(): Promise<void> {
		// Clear the container
		this.graphContainer.empty();

		// specify container dimensions and other properties
		this.graphContainer.style.width = '100%';
		this.graphContainer.style.height = '100%';

		// compute communities and assign one to each node as an attribute
		louvain.assign(this.graph);
		const details = louvain.detailed(this.graph);
		const communities = new Set<string>();
		this.graph.forEachNode((_, attrs) => communities.add(attrs.community));
		const communitiesArray = Array.from(communities);

		// Determine colors, and color each node accordingly
		const palette: Record<string, string> = iwanthue(communities.size).reduce(
			(iter, color, i) => ({ ...iter, [communitiesArray[i]]: color }),
			{}
		);
		this.graph.forEachNode((node, attr) =>
			this.graph.setNodeAttribute(node, 'color', palette[attr.community])
		);

		// assign an (x, y) coordinate each node that respects the louvain communties
		circlepack.assign(this.graph, { 
			hierarchyAttributes: ['community'] 
		});

		// Configure and initialize Sigma renderer
		this.renderer = new Sigma(this.graph, this.graphContainer, {
			allowInvalidContainer: true,
			// autocenter: true,
			renderEdgeLabels: false,
			renderLabels: false,
			minCameraRatio: 0.01,
			maxCameraRatio: 100,
			// This function tells sigma to grow sizes linearly with the zoom, instead of relatively to the zoom ratio's square root:
			// zoomToSizeRatioFunction: (x) => x,
			// If set to false, this disables the default sigma rescaling, so that by default, positions and sizes are preserved on screen (in pixels):
			autoRescale: false,
			// This flag tells sigma to disable the nodes and edges sizes interpolation and instead scales them in the same way it handles positions:
			itemSizesReference: 'positions',
			zIndex: true
		});

		await this.fitToView();
	}

	private async enableHoverEffects(): Promise<void> {
		this.renderer.on('enterNode', ({ node }) => {
			this.graph.setNodeAttribute(node, 'highlighted', true);
		});

		this.renderer.on('leaveNode', ({ node }) => {
			// if (!this.graph.getNodeAttribute(node, 'conference')) {
			this.graph.setNodeAttribute(node, 'highlighted', false);
			// }
		});
	}

	private async enableRightClick(): Promise<void> {
		this.renderer.on('rightClickNode', async ({ node }) => {
			const newTab: WorkspaceLeaf = this.app.workspace.getLeaf('tab');
			const nodeFile: TFile = this.app.vault.getFileByPath(node);
			await newTab.openFile(nodeFile);
		});
	}

	private async intializeSearch(): Promise<void> {
		this.searchBar = new SearchComponent(this.controlsContainer);
		this.searchBar.setPlaceholder('Search nodes...');
		this.searchBar.clearButtonEl.id = 'search-clear-button';

		// Add search functionality
		this.searchBar.onChange((searchTerm) => {
			if (!searchTerm || searchTerm.length < 5) {
				// Reset all nodes to default state if search is empty
				this.graph.forEachNode((node) => {
					this.graph.setNodeAttribute(node, 'highlighted', false);
				});
				return;
			}

			// Highlight nodes that match the search term
			this.graph.forEachNode((node) => {
				const label = this.graph.getNodeAttribute(node, 'label');
				const matches = label.toLowerCase().includes(searchTerm.toLowerCase());
				this.graph.setNodeAttribute(node, 'highlighted', matches);
			});
		});
	}

	private async initializeLayoutControls(): Promise<void> {
		this.layoutControls = new DropdownComponent(this.controlsContainer);
		this.layoutControls.addOptions({
			circlePack: 'Circle Pack',
			random: 'Random',
			circular: 'Circular'
		});
		this.layoutControls.onChange(async (value: string) => {
			if (value === 'circlePack') {
				await this.circlepackLayout();
			}
			if (value === 'random') {
				await this.randomLayout();
			}
			if (value === 'circular') {
				await this.circularLayout();
			}
			this.fitToView();
		});
	}

	private async initializeRedrawControls(): Promise<void> {
		this.redrawButton = new ButtonComponent(this.controlsContainer);
		this.redrawButton.setButtonText('Redraw Graph');
		this.redrawButton.setClass('sigma-redraw-button');
		this.redrawButton.onClick((evt: MouseEvent) => {
			this.renderer.refresh();
			new Notice('Redraw Complete');
		});
	}

	private async initializeFitControls(): Promise<void> {
		this.fitButton = new ButtonComponent(this.controlsContainer);
		this.fitButton.setButtonText('Fit To View');
		this.fitButton.setClass('sigma-fit-button');
		this.fitButton.onClick((evt: MouseEvent) => {
			this.fitToView();
		});
	}

	private async configureControls(): Promise<void> {
		// Create and configure search bar
		await this.intializeSearch();

		// Create and configure layout selection dropdown
		await this.initializeLayoutControls();
		
		// Create and configure various control buttons
		await this.initializeRedrawControls();
		await this.initializeFitControls();
	}

	private fitToView(): void {
		fitViewportToNodes(this.renderer, this.graph.nodes());
	}

	private async gexfString(): string {
		return gexf.write(this.graph);
	}

	private async circularLayout(): void {
		if (this.cancelCurrentAnimation) {
			this.cancelCurrentAnimation();
		}
		//since we want to use animations we need to process positions before applying them through animateNodes
		const circularPositions = circular(this.graph, { scale: 500 });
		//In other context, it's possible to apply the position directly we : circular.assign(graph, {scale:100})
		this.cancelCurrentAnimation = animateNodes(this.graph, circularPositions, {
			duration: 2000,
			easing: 'linear'
		});
	}

	private async randomLayout(): void {
		if (this.cancelCurrentAnimation) {
			this.cancelCurrentAnimation();
		}
		//since we want to use animations we need to process positions before applying them through animateNodes
		const randomPositions = random(this.graph, { scale: 1000 });
		this.cancelCurrentAnimation = animateNodes(this.graph, randomPositions, {
			duration: 2000,
			easing: 'linear'
		});
	}

	private async circlepackLayout(): void {
		if (this.cancelCurrentAnimation) {
			this.cancelCurrentAnimation();
		}
		//since we want to use animations we need to process positions before applying them through animateNodes
		const circlepackPositions = circlepack(this.graph, {
			hierarchyAttributes: ['community']
		});
		this.cancelCurrentAnimation = animateNodes(this.graph, circlepackPositions, {
			duration: 2000,
			easing: 'linear'
		});
	}
}
