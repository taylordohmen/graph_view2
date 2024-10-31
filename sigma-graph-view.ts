import { ItemView, WorkspaceLeaf } from 'obsidian';
import Graph from "graphology";
import Sigma from "sigma";

export const VIEW_TYPE_SIGMA = 'sigma-graph-view';

export class SigmaGraphView extends ItemView {
  graph: Graph;
  sigmaInstance: Sigma | null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);

    // Initialize graphology graph
    this.graph = new Graph();

    // Example nodes and edges for demo purposes
    this.graph.addNode("1", { label: "Node 1", x: 0, y: 0, size: 10, color: "blue" });
    this.graph.addNode("2", { label: "Node 2", x: 1, y: 1, size: 20, color: "red" });
    this.graph.addEdge("1", "2", { size: 5, color: "purple" });
  }

  getViewType() {
    return VIEW_TYPE_SIGMA;
  }

  getDisplayText() {
    return 'Sigma Graph View';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    const div = container.createEl('div');
    div.style.width = "100%";
    div.style.height = "100%";
    div.style.position = "absolute";
    div.style.top = "0";
    div.style.left = "0";
    this.sigmaInstance = new Sigma(this.graph, div);
  }

  async onClose() {
    // Nothing to clean up.
  }
}