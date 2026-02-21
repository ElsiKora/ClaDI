import type { EDependencyLifecycle, EProviderType } from "@domain/enum";

export interface IDependencyGraph {
	edges: Array<IDependencyGraphEdge>;
	nodes: Array<IDependencyGraphNode>;
	scopeId: string;
}

export interface IDependencyGraphEdge {
	from: string;
	scopeId: string;
	to: string;
}

export interface IDependencyGraphNode {
	isMultiBinding: boolean;
	lifecycle: EDependencyLifecycle;
	providerType: EProviderType;
	scopeId: string;
	token: string;
}
