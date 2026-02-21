import type { IProviderRegistration } from "@infrastructure/class/di/interface/provider/registration.interface";

export interface IProviderLookup<TOwnerScope = unknown> {
	lookupPath: Array<string>;
	owner: TOwnerScope;
	registration?: IProviderRegistration<unknown>;
	registrations?: ReadonlyArray<IProviderRegistration<unknown>>;
}
