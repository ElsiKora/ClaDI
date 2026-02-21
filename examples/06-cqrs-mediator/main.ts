/**
 * Example 06: CQRS + Mediator Pattern
 *
 * A production-style implementation of Command/Query Responsibility Segregation
 * with a Mediator that routes commands and queries to their handlers.
 *
 * Key patterns:
 * - Multi-binding to register many handlers under one token
 * - Mediator resolves all handlers at runtime and dispatches by type
 * - Commands mutate state and return void; Queries read state and return data
 * - Validation pipeline before handler execution
 */

import { createDIContainer, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDIContainer, Token } from "@elsikora/cladi";

// ─── CQRS Kernel ───

interface ICommand {
	readonly type: string;
}

interface IQuery {
	readonly type: string;
}

interface ICommandHandler<TCommand extends ICommand = ICommand> {
	readonly commandType: string;
	execute(command: TCommand): Promise<void>;
}

interface IQueryHandler<TQuery extends IQuery = IQuery, TResult = unknown> {
	readonly queryType: string;
	execute(query: TQuery): Promise<TResult>;
}

interface IValidator<TInput extends ICommand | IQuery = ICommand | IQuery> {
	readonly targetType: string;
	validate(input: TInput): Array<string>;
}

interface IMediator {
	dispatch<TCommand extends ICommand>(command: TCommand): Promise<void>;
	query<TResult>(query: IQuery): Promise<TResult>;
}

// ─── Domain Model ───

interface IUser {
	createdAt: Date;
	email: string;
	id: string;
	name: string;
	status: "active" | "suspended";
}

interface IUserRepository {
	findAll(): Array<IUser>;
	findByEmail(email: string): IUser | undefined;
	findById(id: string): IUser | undefined;
	save(user: IUser): void;
	update(id: string, patch: Partial<IUser>): void;
}

interface IAuditLog {
	record(action: string, details: Record<string, unknown>): void;
	getEntries(): Array<{ action: string; details: Record<string, unknown>; timestamp: Date }>;
}

// ─── Commands & Queries ───

interface ICreateUserCommand extends ICommand {
	type: "CreateUser";
	email: string;
	name: string;
}

interface ISuspendUserCommand extends ICommand {
	type: "SuspendUser";
	userId: string;
	reason: string;
}

interface IGetUserQuery extends IQuery {
	type: "GetUser";
	userId: string;
}

interface IListUsersQuery extends IQuery {
	type: "ListUsers";
	statusFilter?: "active" | "suspended";
}

interface IGetAuditLogQuery extends IQuery {
	type: "GetAuditLog";
}

// ─── Tokens ───

const UserRepositoryToken: Token<IUserRepository> = createToken<IUserRepository>("UserRepository");
const AuditLogToken: Token<IAuditLog> = createToken<IAuditLog>("AuditLog");
const CommandHandlerToken: Token<ICommandHandler> = createToken<ICommandHandler>("CommandHandler");
const QueryHandlerToken: Token<IQueryHandler> = createToken<IQueryHandler>("QueryHandler");
const ValidatorToken: Token<IValidator> = createToken<IValidator>("Validator");
const MediatorToken: Token<IMediator> = createToken<IMediator>("Mediator");

// ─── Infrastructure ───

function createUserRepository(): IUserRepository {
	const users: Map<string, IUser> = new Map();

	return {
		findAll: () => [...users.values()],
		findByEmail: (email: string) => [...users.values()].find((u) => u.email === email),
		findById: (id: string) => users.get(id),
		save: (user: IUser) => users.set(user.id, user),
		update: (id: string, patch: Partial<IUser>) => {
			const existing: IUser | undefined = users.get(id);

			if (existing) {
				users.set(id, { ...existing, ...patch });
			}
		},
	};
}

function createAuditLog(): IAuditLog {
	const entries: Array<{ action: string; details: Record<string, unknown>; timestamp: Date }> = [];

	return {
		getEntries: () => [...entries],
		record: (action: string, details: Record<string, unknown>) => {
			entries.push({ action, details, timestamp: new Date() });
		},
	};
}

// ─── Command Handlers ───

let userSequence = 0;

function createCreateUserHandler(repo: IUserRepository, audit: IAuditLog): ICommandHandler<ICreateUserCommand> {
	return {
		commandType: "CreateUser",
		execute: async (command: ICreateUserCommand) => {
			const id: string = `usr_${++userSequence}`;
			const user: IUser = {
				createdAt: new Date(),
				email: command.email,
				id,
				name: command.name,
				status: "active",
			};

			repo.save(user);
			audit.record("USER_CREATED", { email: user.email, userId: id });
			console.log(`    [CreateUserHandler] Created user "${user.name}" (${id})`);
		},
	};
}

function createSuspendUserHandler(repo: IUserRepository, audit: IAuditLog): ICommandHandler<ISuspendUserCommand> {
	return {
		commandType: "SuspendUser",
		execute: async (command: ISuspendUserCommand) => {
			const user: IUser | undefined = repo.findById(command.userId);

			if (!user) {
				throw new Error(`User ${command.userId} not found`);
			}

			repo.update(command.userId, { status: "suspended" });
			audit.record("USER_SUSPENDED", { reason: command.reason, userId: command.userId });
			console.log(`    [SuspendUserHandler] Suspended "${user.name}" — ${command.reason}`);
		},
	};
}

// ─── Query Handlers ───

function createGetUserHandler(repo: IUserRepository): IQueryHandler<IGetUserQuery, IUser | undefined> {
	return {
		queryType: "GetUser",
		execute: async (query: IGetUserQuery) => repo.findById(query.userId),
	};
}

function createListUsersHandler(repo: IUserRepository): IQueryHandler<IListUsersQuery, Array<IUser>> {
	return {
		queryType: "ListUsers",
		execute: async (query: IListUsersQuery) => {
			const all: Array<IUser> = repo.findAll();

			return query.statusFilter ? all.filter((u) => u.status === query.statusFilter) : all;
		},
	};
}

function createGetAuditLogHandler(audit: IAuditLog): IQueryHandler<IGetAuditLogQuery> {
	return {
		queryType: "GetAuditLog",
		execute: async () => audit.getEntries(),
	};
}

// ─── Validators ───

function createCreateUserValidator(repo: IUserRepository): IValidator<ICreateUserCommand> {
	return {
		targetType: "CreateUser",
		validate: (input: ICreateUserCommand) => {
			const errors: Array<string> = [];

			if (!input.name || input.name.trim().length === 0) {
				errors.push("Name is required");
			}

			if (!input.email || !input.email.includes("@")) {
				errors.push("Valid email is required");
			}

			if (repo.findByEmail(input.email)) {
				errors.push(`Email "${input.email}" is already taken`);
			}

			return errors;
		},
	};
}

// ─── Mediator ───

function createMediator(commandHandlers: Array<ICommandHandler>, queryHandlers: Array<IQueryHandler>, validators: Array<IValidator>): IMediator {
	const commandMap: Map<string, ICommandHandler> = new Map();
	const queryMap: Map<string, IQueryHandler> = new Map();
	const validatorMap: Map<string, Array<IValidator>> = new Map();

	for (const handler of commandHandlers) {
		commandMap.set(handler.commandType, handler);
	}

	for (const handler of queryHandlers) {
		queryMap.set(handler.queryType, handler);
	}

	for (const validator of validators) {
		const existing: Array<IValidator> = validatorMap.get(validator.targetType) ?? [];
		existing.push(validator);
		validatorMap.set(validator.targetType, existing);
	}

	function runValidation(input: ICommand | IQuery): void {
		const applicableValidators: Array<IValidator> = validatorMap.get(input.type) ?? [];
		const allErrors: Array<string> = applicableValidators.flatMap((v) => v.validate(input));

		if (allErrors.length > 0) {
			throw new Error(`Validation failed for "${input.type}": ${allErrors.join("; ")}`);
		}
	}

	return {
		dispatch: async <TCommand extends ICommand>(command: TCommand) => {
			const handler: ICommandHandler | undefined = commandMap.get(command.type);

			if (!handler) {
				throw new Error(`No command handler for "${command.type}"`);
			}

			runValidation(command);
			await handler.execute(command);
		},
		query: async <TResult>(queryInput: IQuery) => {
			const handler: IQueryHandler | undefined = queryMap.get(queryInput.type);

			if (!handler) {
				throw new Error(`No query handler for "${queryInput.type}"`);
			}

			runValidation(queryInput);

			return (await handler.execute(queryInput)) as TResult;
		},
	};
}

// ─── Bootstrap ───

async function main(): Promise<void> {
	console.log("=== Example 06: CQRS + Mediator Pattern ===\n");

	const container: IDIContainer = createDIContainer({ scopeName: "cqrs-app" });

	// Infrastructure (singletons)
	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: UserRepositoryToken,
		useFactory: () => createUserRepository(),
	});

	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: AuditLogToken,
		useFactory: () => createAuditLog(),
	});

	// Command handlers (multi-binding)
	container.register({
		deps: [UserRepositoryToken, AuditLogToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: CommandHandlerToken,
		useFactory: (repo: IUserRepository, audit: IAuditLog) => createCreateUserHandler(repo, audit),
	});

	container.register({
		deps: [UserRepositoryToken, AuditLogToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: CommandHandlerToken,
		useFactory: (repo: IUserRepository, audit: IAuditLog) => createSuspendUserHandler(repo, audit),
	});

	// Query handlers (multi-binding)
	container.register({
		deps: [UserRepositoryToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: QueryHandlerToken,
		useFactory: (repo: IUserRepository) => createGetUserHandler(repo),
	});

	container.register({
		deps: [UserRepositoryToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: QueryHandlerToken,
		useFactory: (repo: IUserRepository) => createListUsersHandler(repo),
	});

	container.register({
		deps: [AuditLogToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: QueryHandlerToken,
		useFactory: (audit: IAuditLog) => createGetAuditLogHandler(audit),
	});

	// Validators (multi-binding)
	container.register({
		deps: [UserRepositoryToken] as const,
		isMultiBinding: true,
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: ValidatorToken,
		useFactory: (repo: IUserRepository) => createCreateUserValidator(repo),
	});

	// Mediator (consumes all handlers and validators)
	container.register({
		lifecycle: EDependencyLifecycle.SINGLETON,
		provide: MediatorToken,
		useFactory: () => {
			const commands: Array<ICommandHandler> = container.resolveAll(CommandHandlerToken);
			const queries: Array<IQueryHandler> = container.resolveAll(QueryHandlerToken);
			const validators: Array<IValidator> = container.resolveAll(ValidatorToken);

			console.log(`  Mediator initialized: ${commands.length} commands, ${queries.length} queries, ${validators.length} validators\n`);

			return createMediator(commands, queries, validators);
		},
	});

	const mediator: IMediator = container.resolve(MediatorToken);

	// ─── Scenario: User management workflow ───

	console.log("── 1. Creating users ──");
	await mediator.dispatch({ type: "CreateUser", email: "alice@acme.com", name: "Alice Johnson" });
	await mediator.dispatch({ type: "CreateUser", email: "bob@acme.com", name: "Bob Smith" });
	await mediator.dispatch({ type: "CreateUser", email: "charlie@acme.com", name: "Charlie Brown" });

	console.log("\n── 2. Validation: duplicate email ──");

	try {
		await mediator.dispatch({ type: "CreateUser", email: "alice@acme.com", name: "Fake Alice" });
	} catch (error: unknown) {
		console.log(`    [Expected error] ${(error as Error).message}`);
	}

	console.log("\n── 3. Query: list all active users ──");
	const activeUsers: Array<IUser> = await mediator.query<Array<IUser>>({
		type: "ListUsers",
		statusFilter: "active",
	} as IListUsersQuery);

	for (const user of activeUsers) {
		console.log(`    - ${user.name} <${user.email}> [${user.status}]`);
	}

	console.log("\n── 4. Command: suspend a user ──");
	const allUsers: Array<IUser> = await mediator.query<Array<IUser>>({ type: "ListUsers" } as IListUsersQuery);
	const bob: IUser | undefined = allUsers.find((u) => u.name === "Bob Smith");

	if (bob) {
		await mediator.dispatch({ type: "SuspendUser", userId: bob.id, reason: "Policy violation" } as ISuspendUserCommand);
	}

	console.log("\n── 5. Query: list users by status ──");
	const active: Array<IUser> = await mediator.query<Array<IUser>>({ type: "ListUsers", statusFilter: "active" } as IListUsersQuery);
	const suspended: Array<IUser> = await mediator.query<Array<IUser>>({ type: "ListUsers", statusFilter: "suspended" } as IListUsersQuery);
	console.log(`    Active: ${active.map((u) => u.name).join(", ")}`);
	console.log(`    Suspended: ${suspended.map((u) => u.name).join(", ")}`);

	console.log("\n── 6. Query: audit log ──");
	type TAuditEntry = { action: string; details: Record<string, unknown>; timestamp: Date };
	const auditEntries: Array<TAuditEntry> = await mediator.query<Array<TAuditEntry>>({ type: "GetAuditLog" });

	for (const entry of auditEntries) {
		console.log(`    [${entry.action}] ${JSON.stringify(entry.details)}`);
	}

	await container.dispose();
	console.log("\n✓ Example 06 complete");
}

main().catch((error: unknown) => {
	console.error((error as Error).message);
	process.exitCode = 1;
});
