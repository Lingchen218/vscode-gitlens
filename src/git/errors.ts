export class GitSearchError extends Error {
	constructor(public readonly original: Error) {
		super(original.message);

		Error.captureStackTrace?.(this, GitSearchError);
	}
}

export const enum ApplyPatchCommitErrorReason {
	StashFailed,
	CreateWorktreeFailed,
	ApplyFailed,
	ApplyAbortedWouldOverwrite,
	AppliedWithConflicts,
}

export class ApplyPatchCommitError extends Error {
	static is(ex: unknown, reason?: ApplyPatchCommitErrorReason): ex is ApplyPatchCommitError {
		return ex instanceof ApplyPatchCommitError && (reason == null || ex.reason === reason);
	}

	readonly original?: Error;
	readonly reason: ApplyPatchCommitErrorReason | undefined;

	constructor(reason: ApplyPatchCommitErrorReason, message?: string, original?: Error) {
		message ||= '无法应用补丁';
		super(message);

		this.original = original;
		this.reason = reason;
		Error.captureStackTrace?.(this, ApplyPatchCommitError);
	}
}

export class BlameIgnoreRevsFileError extends Error {
	static is(ex: unknown): ex is BlameIgnoreRevsFileError {
		return ex instanceof BlameIgnoreRevsFileError;
	}

	constructor(
		public readonly fileName: string,
		public readonly original?: Error,
	) {
		super(`无效的 blame.ignoreRevsFile: '${fileName}'`);

		Error.captureStackTrace?.(this, BlameIgnoreRevsFileError);
	}
}

export class BlameIgnoreRevsFileBadRevisionError extends Error {
	static is(ex: unknown): ex is BlameIgnoreRevsFileBadRevisionError {
		return ex instanceof BlameIgnoreRevsFileBadRevisionError;
	}

	constructor(
		public readonly revision: string,
		public readonly original?: Error,
	) {
		super(`blame.ignoreRevsFile 中的修订版本无效: '${revision}'`);

		Error.captureStackTrace?.(this, BlameIgnoreRevsFileBadRevisionError);
	}
}

export const enum StashApplyErrorReason {
	WorkingChanges,
}

export class StashApplyError extends Error {
	static is(ex: unknown, reason?: StashApplyErrorReason): ex is StashApplyError {
		return ex instanceof StashApplyError && (reason == null || ex.reason === reason);
	}

	readonly original?: Error;
	readonly reason: StashApplyErrorReason | undefined;

	constructor(reason?: StashApplyErrorReason, original?: Error);
	constructor(message?: string, original?: Error);
	constructor(messageOrReason: string | StashApplyErrorReason | undefined, original?: Error) {
		let message;
		let reason: StashApplyErrorReason | undefined;
		if (messageOrReason == null) {
			message = 'Unable to apply stash';
		} else if (typeof messageOrReason === 'string') {
			message = messageOrReason;
			reason = undefined;
		} else {
			reason = messageOrReason;
			message =
				'Unable to apply stash. Your working tree changes would be overwritten. Please commit or stash your changes before trying again';
		}
		super(message);

		this.original = original;
		this.reason = reason;
		Error.captureStackTrace?.(this, StashApplyError);
	}
}

export const enum StashPushErrorReason {
	ConflictingStagedAndUnstagedLines,
	NothingToSave,
}

export class StashPushError extends Error {
	static is(ex: unknown, reason?: StashPushErrorReason): ex is StashPushError {
		return ex instanceof StashPushError && (reason == null || ex.reason === reason);
	}

	readonly original?: Error;
	readonly reason: StashPushErrorReason | undefined;

	constructor(reason?: StashPushErrorReason, original?: Error);
	constructor(message?: string, original?: Error);
	constructor(messageOrReason: string | StashPushErrorReason | undefined, original?: Error) {
		let message;
		let reason: StashPushErrorReason | undefined;
		if (messageOrReason == null) {
			message = '无法储藏';
		} else if (typeof messageOrReason === 'string') {
			message = messageOrReason;
			reason = undefined;
		} else {
			reason = messageOrReason;
			switch (reason) {
				case StashPushErrorReason.ConflictingStagedAndUnstagedLines:
					message = '更改已储藏，但由于至少一个文件在相同行上有已暂存和未暂存的更改，工作树无法更新';
					break;
				case StashPushErrorReason.NothingToSave:
					message = '没有要储藏的文件';
					break;
				default:
					message = '无法储藏';
			}
		}
		super(message);

		this.original = original;
		this.reason = reason;
		Error.captureStackTrace?.(this, StashApplyError);
	}
}

export const enum PushErrorReason {
	RemoteAhead,
	TipBehind,
	PushRejected,
	PushRejectedWithLease,
	PushRejectedWithLeaseIfIncludes,
	PermissionDenied,
	RemoteConnection,
	NoUpstream,
	Other,
}

export class PushError extends Error {
	static is(ex: unknown, reason?: PushErrorReason): ex is PushError {
		return ex instanceof PushError && (reason == null || ex.reason === reason);
	}

	readonly original?: Error;
	readonly reason: PushErrorReason | undefined;

	constructor(reason?: PushErrorReason, original?: Error, branch?: string, remote?: string);
	constructor(message?: string, original?: Error);
	constructor(
		messageOrReason: string | PushErrorReason | undefined,
		original?: Error,
		branch?: string,
		remote?: string,
	) {
		let message;
		const baseMessage = `无法推送${branch ? ` 分支 '${branch}'` : ''}${remote ? ` 到 ${remote}` : ''}`;
		let reason: PushErrorReason | undefined;
		if (messageOrReason == null) {
			message = baseMessage;
		} else if (typeof messageOrReason === 'string') {
			message = messageOrReason;
			reason = undefined;
		} else {
			reason = messageOrReason;

			switch (reason) {
				case PushErrorReason.RemoteAhead:
					message = `${baseMessage}，因为远程包含您本地没有的工作。请先获取。`;
					break;
				case PushErrorReason.TipBehind:
					message = `${baseMessage}，因为它落后于其远程副本。请先拉取。`;
					break;
				case PushErrorReason.PushRejected:
					message = `${baseMessage}，因为某些引用推送失败或推送被拒绝。请先拉取。`;
					break;
				case PushErrorReason.PushRejectedWithLease:
				case PushErrorReason.PushRejectedWithLeaseIfIncludes:
					message = `无法强制推送${branch ? ` 分支 '${branch}'` : ''}${
						remote ? ` 到 ${remote}` : ''
					}，因为某些引用推送失败或推送被拒绝。自上次检出以来，远程跟踪分支的提示已更新。请先拉取。`;
					break;
				case PushErrorReason.PermissionDenied:
					message = `${baseMessage}，因为您没有权限推送到此远程仓库。`;
					break;
				case PushErrorReason.RemoteConnection:
					message = `${baseMessage}，因为无法连接到远程仓库。`;
					break;
				case PushErrorReason.NoUpstream:
					message = `${baseMessage}，因为它没有上游分支。`;
					break;
				default:
					message = baseMessage;
			}
		}
		super(message);

		this.original = original;
		this.reason = reason;
		Error.captureStackTrace?.(this, PushError);
	}
}

export const enum PullErrorReason {
	Conflict,
	GitIdentity,
	RemoteConnection,
	UnstagedChanges,
	UnmergedFiles,
	UncommittedChanges,
	OverwrittenChanges,
	RefLocked,
	RebaseMultipleBranches,
	TagConflict,
	Other,
}

export class PullError extends Error {
	static is(ex: unknown, reason?: PullErrorReason): ex is PullError {
		return ex instanceof PullError && (reason == null || ex.reason === reason);
	}

	readonly original?: Error;
	readonly reason: PullErrorReason | undefined;

	constructor(reason?: PullErrorReason, original?: Error, branch?: string, remote?: string);
	constructor(message?: string, original?: Error);
	constructor(messageOrReason: string | PullErrorReason | undefined, original?: Error) {
		let message;
		let reason: PullErrorReason | undefined;
		const baseMessage = `无法拉取`;
		if (messageOrReason == null) {
			message = baseMessage;
		} else if (typeof messageOrReason === 'string') {
			message = messageOrReason;
			reason = undefined;
		} else {
			reason = messageOrReason;
			switch (reason) {
				case PullErrorReason.Conflict:
					message = `${baseMessage}，因为存在冲突。`;
					break;
				case PullErrorReason.GitIdentity:
					message = `${baseMessage}，因为您尚未设置 Git 身份。`;
					break;
				case PullErrorReason.RemoteConnection:
					message = `${baseMessage}，因为无法连接到远程仓库。`;
					break;
				case PullErrorReason.UnstagedChanges:
					message = `${baseMessage}，因为您有未暂存的更改。`;
					break;
				case PullErrorReason.UnmergedFiles:
					message = `${baseMessage}，因为您有未合并的文件。`;
					break;
				case PullErrorReason.UncommittedChanges:
					message = `${baseMessage}，因为您有未提交的更改。`;
					break;
				case PullErrorReason.OverwrittenChanges:
					message = `${baseMessage}，因为某些文件的本地更改将被覆盖。`;
					break;
				case PullErrorReason.RefLocked:
					message = `${baseMessage}，因为无法更新本地引用。`;
					break;
				case PullErrorReason.RebaseMultipleBranches:
					message = `${baseMessage}，因为您正在尝试变基到多个分支。`;
					break;
				case PullErrorReason.TagConflict:
					message = `${baseMessage}，因为本地标签将被覆盖。`;
					break;
				default:
					message = baseMessage;
			}
		}
		super(message);

		this.original = original;
		this.reason = reason;
		Error.captureStackTrace?.(this, PullError);
	}
}

export const enum FetchErrorReason {
	NoFastForward,
	NoRemote,
	RemoteConnection,
	Other,
}

export class FetchError extends Error {
	static is(ex: unknown, reason?: FetchErrorReason): ex is FetchError {
		return ex instanceof FetchError && (reason == null || ex.reason === reason);
	}

	readonly original?: Error;
	readonly reason: FetchErrorReason | undefined;

	constructor(reason?: FetchErrorReason, original?: Error, branch?: string, remote?: string);
	constructor(message?: string, original?: Error);
	constructor(
		messageOrReason: string | FetchErrorReason | undefined,
		original?: Error,
		branch?: string,
		remote?: string,
	) {
		let message;
		const baseMessage = `无法获取${branch ? ` 分支 '${branch}'` : ''}${remote ? ` 从 ${remote}` : ''}`;
		let reason: FetchErrorReason | undefined;
		if (messageOrReason == null) {
			message = baseMessage;
		} else if (typeof messageOrReason === 'string') {
			message = messageOrReason;
			reason = undefined;
		} else {
			reason = messageOrReason;
			switch (reason) {
				case FetchErrorReason.NoFastForward:
					message = `${baseMessage}，因为它无法被快速转发`;
					break;
				case FetchErrorReason.NoRemote:
					message = `${baseMessage}，因为没有指定远程仓库`;
					break;
				case FetchErrorReason.RemoteConnection:
					message = `${baseMessage}。无法连接到远程仓库。`;
					break;
				default:
					message = baseMessage;
			}
		}
		super(message);

		this.original = original;
		this.reason = reason;
		Error.captureStackTrace?.(this, FetchError);
	}
}

export const enum CherryPickErrorReason {
	Conflicts,
	AbortedWouldOverwrite,
	Other,
}

export class CherryPickError extends Error {
	static is(ex: unknown, reason?: CherryPickErrorReason): ex is CherryPickError {
		return ex instanceof CherryPickError && (reason == null || ex.reason === reason);
	}

	readonly original?: Error;
	readonly reason: CherryPickErrorReason | undefined;

	constructor(reason?: CherryPickErrorReason, original?: Error, sha?: string);
	constructor(message?: string, original?: Error);
	constructor(messageOrReason: string | CherryPickErrorReason | undefined, original?: Error, sha?: string) {
		let message;
		const baseMessage = `无法cherry-pick${sha ? ` 提交 '${sha}'` : ''}`;
		let reason: CherryPickErrorReason | undefined;
		if (messageOrReason == null) {
			message = baseMessage;
		} else if (typeof messageOrReason === 'string') {
			message = messageOrReason;
			reason = undefined;
		} else {
			reason = messageOrReason;
			switch (reason) {
				case CherryPickErrorReason.AbortedWouldOverwrite:
					message = `${baseMessage}，因为某些本地更改将被覆盖。`;
					break;
				case CherryPickErrorReason.Conflicts:
					message = `${baseMessage}，因为存在冲突。`;
					break;
				default:
					message = baseMessage;
			}
		}
		super(message);

		this.original = original;
		this.reason = reason;
			Error.captureStackTrace?.(this, CherryPickError);
	}
}

export class WorkspaceUntrustedError extends Error {
	constructor() {
		super('无法执行 Git 操作，因为当前工作区不受信任');

		Error.captureStackTrace?.(this, WorkspaceUntrustedError);
	}
}

export const enum WorktreeCreateErrorReason {
	AlreadyCheckedOut,
	AlreadyExists,
}

export class WorktreeCreateError extends Error {
	static is(ex: unknown, reason?: WorktreeCreateErrorReason): ex is WorktreeCreateError {
		return ex instanceof WorktreeCreateError && (reason == null || ex.reason === reason);
	}

	readonly original?: Error;
	readonly reason: WorktreeCreateErrorReason | undefined;

	constructor(reason?: WorktreeCreateErrorReason, original?: Error);
	constructor(message?: string, original?: Error);
	constructor(messageOrReason: string | WorktreeCreateErrorReason | undefined, original?: Error) {
		let message;
		let reason: WorktreeCreateErrorReason | undefined;
		if (messageOrReason == null) {
			message = '无法创建工作树';
		} else if (typeof messageOrReason === 'string') {
			message = messageOrReason;
			reason = undefined;
		} else {
			reason = messageOrReason;
			switch (reason) {
				case WorktreeCreateErrorReason.AlreadyCheckedOut:
					message = '无法创建工作树，因为它已经被检出';
					break;
				case WorktreeCreateErrorReason.AlreadyExists:
					message = '无法创建工作树，因为它已经存在';
					break;
			}
		}
		super(message);

		this.original = original;
		this.reason = reason;
		Error.captureStackTrace?.(this, WorktreeCreateError);
	}
}

export const enum WorktreeDeleteErrorReason {
	HasChanges,
	MainWorkingTree,
}

export class WorktreeDeleteError extends Error {
	static is(ex: unknown, reason?: WorktreeDeleteErrorReason): ex is WorktreeDeleteError {
		return ex instanceof WorktreeDeleteError && (reason == null || ex.reason === reason);
	}

	readonly original?: Error;
	readonly reason: WorktreeDeleteErrorReason | undefined;

	constructor(reason?: WorktreeDeleteErrorReason, original?: Error);
	constructor(message?: string, original?: Error);
	constructor(messageOrReason: string | WorktreeDeleteErrorReason | undefined, original?: Error) {
		let message;
		let reason: WorktreeDeleteErrorReason | undefined;
		if (messageOrReason == null) {
			message = '无法删除工作树';
		} else if (typeof messageOrReason === 'string') {
			message = messageOrReason;
			reason = undefined;
		} else {
			reason = messageOrReason;
			switch (reason) {
				case WorktreeDeleteErrorReason.HasChanges:
					message = '无法删除工作树，因为存在未提交的更改';
					break;
				case WorktreeDeleteErrorReason.MainWorkingTree:
					message = '无法删除工作树，因为它是主工作树';
					break;
			}
		}
		super(message);

		this.original = original;
		this.reason = reason;
		Error.captureStackTrace?.(this, WorktreeDeleteError);
	}
}
