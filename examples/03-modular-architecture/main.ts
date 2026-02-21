/**
 * Example 03: Modular Architecture
 *
 * Demonstrates the ClaDI module system for organizing large applications:
 * - Creating isolated modules with their own providers
 * - Controlling visibility through exports
 * - Importing modules and composing them into a container
 * - Transitive dependency resolution across module boundaries
 */

import { composeModules, createDIContainer, createModule, createToken, EDependencyLifecycle } from "@elsikora/cladi";

import type { IDIContainer, IDIModule, Token } from "@elsikora/cladi";

// ─── Domain Interfaces ───

interface IDatabaseConnection {
	query(sql: string): Array<Record<string, unknown>>;
}

interface IUserRepository {
	findAll(): Array<{ email: string; id: number; name: string }>;
	findById(id: number): { email: string; id: number; name: string } | undefined;
}

interface IEmailService {
	send(to: string, subject: string, body: string): void;
}

interface INotificationService {
	notifyUser(userId: number, message: string): void;
}

interface IUserService {
	getUser(id: number): { email: string; id: number; name: string } | undefined;
	listUsers(): Array<{ email: string; id: number; name: string }>;
	welcomeUser(userId: number): void;
}

// ─── Tokens ───

const DatabaseConnectionToken: Token<IDatabaseConnection> = createToken<IDatabaseConnection>("DatabaseConnection");
const UserRepositoryToken: Token<IUserRepository> = createToken<IUserRepository>("UserRepository");
const EmailServiceToken: Token<IEmailService> = createToken<IEmailService>("EmailService");
const NotificationServiceToken: Token<INotificationService> = createToken<INotificationService>("NotificationService");
const UserServiceToken: Token<IUserService> = createToken<IUserService>("UserService");

// ─── Implementations ───

class InMemoryDatabase implements IDatabaseConnection {
	private readonly data: Array<Record<string, unknown>> = [
		{ email: "alice@example.com", id: 1, name: "Alice" },
		{ email: "bob@example.com", id: 2, name: "Bob" },
		{ email: "charlie@example.com", id: 3, name: "Charlie" },
	];

	query(sql: string): Array<Record<string, unknown>> {
		console.log(`  [DB] Executing: ${sql}`);

		if (sql.startsWith("SELECT * FROM users WHERE id =")) {
			const id = Number(sql.split("= ")[1]);

			return this.data.filter((row) => row["id"] === id);
		}

		return [...this.data];
	}
}

// ─── Database Module ───

const databaseModule: IDIModule = createModule({
	exports: [DatabaseConnectionToken],
	name: "database",
	providers: [
		{
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: DatabaseConnectionToken,
			useFactory: () => {
				console.log("  [database module] Creating database connection");

				return new InMemoryDatabase();
			},
		},
	],
});

// ─── User Module ───

const userModule: IDIModule = createModule({
	exports: [UserRepositoryToken],
	imports: [databaseModule],
	name: "user",
	providers: [
		{
			deps: [DatabaseConnectionToken] as const,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: UserRepositoryToken,
			useFactory: (db: IDatabaseConnection): IUserRepository => {
				console.log("  [user module] Creating user repository");

				return {
					findAll: () => db.query("SELECT * FROM users") as Array<{ email: string; id: number; name: string }>,
					findById: (id: number) => {
						const rows = db.query(`SELECT * FROM users WHERE id = ${id}`);

						return rows[0] as { email: string; id: number; name: string } | undefined;
					},
				};
			},
		},
	],
});

// ─── Notification Module ───

const notificationModule: IDIModule = createModule({
	exports: [NotificationServiceToken],
	imports: [userModule],
	name: "notification",
	providers: [
		{
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: EmailServiceToken,
			useFactory: (): IEmailService => {
				console.log("  [notification module] Creating email service");

				return {
					send: (to: string, subject: string, body: string) => {
						console.log(`  [Email] To: ${to} | Subject: ${subject} | Body: ${body}`);
					},
				};
			},
		},
		{
			deps: [UserRepositoryToken, EmailServiceToken] as const,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: NotificationServiceToken,
			useFactory: (userRepo: IUserRepository, emailService: IEmailService): INotificationService => {
				console.log("  [notification module] Creating notification service");

				return {
					notifyUser: (userId: number, message: string) => {
						const user = userRepo.findById(userId);

						if (user) {
							emailService.send(user.email, "Notification", message);
						} else {
							console.log(`  [Notification] User ${userId} not found, skipping`);
						}
					},
				};
			},
		},
	],
});

// ─── Application Module (root) ───

const appModule: IDIModule = createModule({
	imports: [userModule, notificationModule],
	name: "app",
	providers: [
		{
			deps: [UserRepositoryToken, NotificationServiceToken] as const,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: UserServiceToken,
			useFactory: (userRepo: IUserRepository, notificationService: INotificationService): IUserService => {
				console.log("  [app module] Creating user service");

				return {
					getUser: (id: number) => userRepo.findById(id),
					listUsers: () => userRepo.findAll(),
					welcomeUser: (userId: number) => {
						notificationService.notifyUser(userId, "Welcome to our platform!");
					},
				};
			},
		},
	],
});

// ─── Bootstrap ───

function main(): void {
	console.log("=== Example 03: Modular Architecture ===\n");

	console.log("── Composing modules ──");
	const container: IDIContainer = createDIContainer({ scopeName: "modular-app" });
	composeModules(container, [appModule]);
	console.log();

	console.log("── Using the application ──\n");

	const userService: IUserService = container.resolve(UserServiceToken);

	console.log("\nAll users:");
	const users = userService.listUsers();

	for (const user of users) {
		console.log(`  - ${user.name} (${user.email})`);
	}

	console.log("\nLooking up user #2:");
	const bob = userService.getUser(2);
	console.log(`  Found: ${bob?.name ?? "not found"}\n`);

	console.log("Sending welcome to user #1:");
	userService.welcomeUser(1);

	console.log("\n── Module boundaries ──");
	console.log(`  EmailService exported: ${container.has(EmailServiceToken)}`);
	console.log(`  NotificationService exported: ${container.has(NotificationServiceToken)}`);
	console.log(`  UserRepository exported: ${container.has(UserRepositoryToken)}`);
	console.log(`  DatabaseConnection (transitive): ${container.has(DatabaseConnectionToken)}`);

	console.log("\n✓ Example 03 complete");
}

main();
