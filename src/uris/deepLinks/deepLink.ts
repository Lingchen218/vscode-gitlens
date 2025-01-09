import type { Uri } from 'vscode';
import type { GitReference } from '../../git/models/reference';
import type { GitRemote } from '../../git/models/remote';
import type { Repository } from '../../git/models/repository';
import type { OpenWorkspaceLocation } from '../../system/utils';

export type UriTypes = 'link';

export enum DeepLinkType {
	Branch = 'b',
	Commit = 'c',
	Comparison = 'compare',
	Draft = 'drafts',
	File = 'f',
	Repository = 'r',
	Tag = 't',
	Workspace = 'workspace',
}

export enum DeepLinkActionType {
	Switch = 'switch',
	SwitchToPullRequest = 'switch-to-pr',
	SwitchToPullRequestWorktree = 'switch-to-pr-worktree',
	SwitchToAndSuggestPullRequest = 'switch-to-and-suggest-pr',
}

export const AccountDeepLinkTypes: DeepLinkType[] = [DeepLinkType.Draft, DeepLinkType.Workspace];
export const PaidDeepLinkTypes: DeepLinkType[] = [];

export function deepLinkTypeToString(type: DeepLinkType): string {
	switch (type) {
		case DeepLinkType.Branch:
			return '分支';
		case DeepLinkType.Commit:
			return '提交';
		case DeepLinkType.Comparison:
			return '比较';
		case DeepLinkType.Draft:
			return '云补丁';
		case DeepLinkType.File:
			return '文件';
		case DeepLinkType.Repository:
			return '仓库';
		case DeepLinkType.Tag:
			return '标签';
		case DeepLinkType.Workspace:
			return '工作区';
		default:
			debugger;
			return '未知';
	}
}

export function refTypeToDeepLinkType(refType: GitReference['refType']): DeepLinkType {
	switch (refType) {
		case 'branch':
			return DeepLinkType.Branch;
		case 'revision':
			return DeepLinkType.Commit;
		case 'tag':
			return DeepLinkType.Tag;
		default:
			return DeepLinkType.Repository;
	}
}

export interface DeepLink {
	type: DeepLinkType;
	mainId?: string;
	remoteUrl?: string;
	repoPath?: string;
	filePath?: string;
	targetId?: string;
	secondaryTargetId?: string;
	secondaryRemoteUrl?: string;
	action?: string;
	params?: URLSearchParams;
}

export function parseDeepLinkUri(uri: Uri): DeepLink | undefined {
	// The link target id is everything after the link target.
	// For example, if the uri is /link/r/{repoId}/b/{branchName}?url={remoteUrl},
	// the link target id is {branchName}
	const [, type, prefix, mainId, target, ...rest] = uri.path.split('/');
	if (type !== 'link') return undefined;

	const urlParams = new URLSearchParams(uri.query);
	switch (prefix) {
		case DeepLinkType.Repository: {
			let remoteUrl = urlParams.get('url') ?? undefined;
			if (remoteUrl != null) {
				remoteUrl = decodeURIComponent(remoteUrl);
			}
			let repoPath = urlParams.get('path') ?? undefined;
			if (repoPath != null) {
				repoPath = decodeURIComponent(repoPath);
			}
			if (!remoteUrl && !repoPath) return undefined;

			const action = urlParams.get('action') ?? undefined;

			if (target == null) {
				return {
					type: DeepLinkType.Repository,
					mainId: mainId,
					remoteUrl: remoteUrl,
					repoPath: repoPath,
				};
			}

			if (rest == null || rest.length === 0) return undefined;

			let targetId: string | undefined;
			let secondaryTargetId: string | undefined;
			let secondaryRemoteUrl: string | undefined;
			let filePath: string | undefined;
			const joined = rest.join('/');

			if (target === DeepLinkType.Comparison) {
				const split = joined.split(/(\.\.\.|\.\.)/);
				if (split.length !== 3) return undefined;
				targetId = split[0];
				secondaryTargetId = split[2];
				secondaryRemoteUrl = urlParams.get('prRepoUrl') ?? undefined;
				if (secondaryRemoteUrl != null) {
					secondaryRemoteUrl = decodeURIComponent(secondaryRemoteUrl);
				}
			} else if (target === DeepLinkType.File) {
				filePath = joined;
				let ref = urlParams.get('ref') ?? undefined;
				if (ref != null) {
					ref = decodeURIComponent(ref);
				}
				targetId = ref;
				let lines = urlParams.get('lines') ?? undefined;
				if (lines != null) {
					lines = decodeURIComponent(lines);
				}
				secondaryTargetId = lines;
			} else {
				targetId = joined;
			}

			return {
				type: target as DeepLinkType,
				mainId: mainId,
				remoteUrl: remoteUrl,
				repoPath: repoPath,
				filePath: filePath,
				targetId: targetId,
				secondaryTargetId: secondaryTargetId,
				secondaryRemoteUrl: secondaryRemoteUrl,
				action: action,
				params: urlParams,
			};
		}
		case DeepLinkType.Draft: {
			if (mainId == null || mainId.match(/^v\d+$/)) return undefined;

			let patchId = urlParams.get('patch') ?? undefined;
			if (patchId != null) {
				patchId = decodeURIComponent(patchId);
			}

			return {
				type: DeepLinkType.Draft,
				targetId: mainId,
				secondaryTargetId: patchId,
				params: urlParams,
			};
		}

		case DeepLinkType.Workspace:
			return {
				type: DeepLinkType.Workspace,
				mainId: mainId,
				params: urlParams,
			};

		default:
			return undefined;
	}
}

export const enum DeepLinkServiceState {
	Idle,
	AccountCheck,
	PlanCheck,
	TypeMatch,
	RepoMatch,
	CloneOrAddRepo,
	AddedRepoMatch,
	RemoteMatch,
	AddRemote,
	TargetMatch,
	Fetch,
	FetchedTargetMatch,
	MaybeOpenRepo,
	RepoOpening,
	EnsureRemoteMatch,
	GoToTarget,
	OpenGraph,
	OpenComparison,
	OpenDraft,
	OpenWorkspace,
	OpenFile,
	OpenInspect,
	SwitchToRef,
}

export const enum DeepLinkServiceAction {
	AccountCheckPassed,
	DeepLinkEventFired,
	DeepLinkCancelled,
	DeepLinkResolved,
	DeepLinkStored,
	DeepLinkErrored,
	LinkIsRepoType,
	LinkIsDraftType,
	LinkIsWorkspaceType,
	PlanCheckPassed,
	RepoMatched,
	RepoMatchedInLocalMapping,
	RepoMatchFailed,
	RepoAdded,
	RemoteMatched,
	RemoteMatchFailed,
	RemoteMatchUnneeded,
	RemoteAdded,
	TargetMatched,
	TargetMatchFailed,
	TargetFetched,
	RepoOpened,
	RepoOpening,
	OpenGraph,
	OpenComparison,
	OpenFile,
	OpenInspect,
	OpenSwitch,
}

export type DeepLinkRepoOpenType = 'clone' | 'folder' | 'workspace' | 'current';

export interface DeepLinkServiceContext {
	state: DeepLinkServiceState;
	url?: string | undefined;
	mainId?: string | undefined;
	repo?: Repository | undefined;
	remoteUrl?: string | undefined;
	remote?: GitRemote | undefined;
	secondaryRemote?: GitRemote | undefined;
	repoPath?: string | undefined;
	filePath?: string | undefined;
	targetId?: string | undefined;
	secondaryTargetId?: string | undefined;
	secondaryRemoteUrl?: string | undefined;
	targetType?: DeepLinkType | undefined;
	targetSha?: string | undefined;
	secondaryTargetSha?: string | undefined;
	action?: string | undefined;
	repoOpenLocation?: OpenWorkspaceLocation | undefined;
	repoOpenUri?: Uri | undefined;
	params?: URLSearchParams | undefined;
	currentBranch?: string | undefined;
}

export const deepLinkStateTransitionTable: Record<string, Record<string, DeepLinkServiceState>> = {
	[DeepLinkServiceState.Idle]: {
		[DeepLinkServiceAction.DeepLinkEventFired]: DeepLinkServiceState.AccountCheck,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.AccountCheck]: {
		[DeepLinkServiceAction.AccountCheckPassed]: DeepLinkServiceState.PlanCheck,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.PlanCheck]: {
		[DeepLinkServiceAction.PlanCheckPassed]: DeepLinkServiceState.TypeMatch,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.TypeMatch]: {
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.LinkIsRepoType]: DeepLinkServiceState.RepoMatch,
		[DeepLinkServiceAction.LinkIsDraftType]: DeepLinkServiceState.OpenDraft,
		[DeepLinkServiceAction.LinkIsWorkspaceType]: DeepLinkServiceState.OpenWorkspace,
	},
	[DeepLinkServiceState.RepoMatch]: {
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.RepoMatched]: DeepLinkServiceState.RemoteMatch,
		[DeepLinkServiceAction.RepoMatchedInLocalMapping]: DeepLinkServiceState.CloneOrAddRepo,
		[DeepLinkServiceAction.RepoMatchFailed]: DeepLinkServiceState.CloneOrAddRepo,
	},
	[DeepLinkServiceState.CloneOrAddRepo]: {
		[DeepLinkServiceAction.RepoAdded]: DeepLinkServiceState.AddedRepoMatch,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.AddedRepoMatch]: {
		[DeepLinkServiceAction.RepoMatched]: DeepLinkServiceState.RemoteMatch,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.RemoteMatch]: {
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.RemoteMatched]: DeepLinkServiceState.TargetMatch,
		[DeepLinkServiceAction.RemoteMatchFailed]: DeepLinkServiceState.AddRemote,
		[DeepLinkServiceAction.RemoteMatchUnneeded]: DeepLinkServiceState.TargetMatch,
	},
	[DeepLinkServiceState.AddRemote]: {
		[DeepLinkServiceAction.RemoteAdded]: DeepLinkServiceState.TargetMatch,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.TargetMatch]: {
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.TargetMatched]: DeepLinkServiceState.MaybeOpenRepo,
		[DeepLinkServiceAction.TargetMatchFailed]: DeepLinkServiceState.Fetch,
	},
	[DeepLinkServiceState.Fetch]: {
		[DeepLinkServiceAction.TargetFetched]: DeepLinkServiceState.FetchedTargetMatch,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.FetchedTargetMatch]: {
		[DeepLinkServiceAction.TargetMatched]: DeepLinkServiceState.MaybeOpenRepo,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.MaybeOpenRepo]: {
		[DeepLinkServiceAction.RepoOpened]: DeepLinkServiceState.EnsureRemoteMatch,
		[DeepLinkServiceAction.RepoOpening]: DeepLinkServiceState.RepoOpening,
		[DeepLinkServiceAction.DeepLinkStored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.RepoOpening]: {
		[DeepLinkServiceAction.RepoOpened]: DeepLinkServiceState.EnsureRemoteMatch,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.EnsureRemoteMatch]: {
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.RemoteMatched]: DeepLinkServiceState.GoToTarget,
	},
	[DeepLinkServiceState.GoToTarget]: {
		[DeepLinkServiceAction.OpenGraph]: DeepLinkServiceState.OpenGraph,
		[DeepLinkServiceAction.OpenFile]: DeepLinkServiceState.OpenFile,
		[DeepLinkServiceAction.OpenSwitch]: DeepLinkServiceState.SwitchToRef,
		[DeepLinkServiceAction.OpenComparison]: DeepLinkServiceState.OpenComparison,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.OpenGraph]: {
		[DeepLinkServiceAction.DeepLinkResolved]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.OpenComparison]: {
		[DeepLinkServiceAction.DeepLinkResolved]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.OpenDraft]: {
		[DeepLinkServiceAction.DeepLinkResolved]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.OpenWorkspace]: {
		[DeepLinkServiceAction.DeepLinkResolved]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.OpenFile]: {
		[DeepLinkServiceAction.DeepLinkResolved]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.OpenInspect]: {
		[DeepLinkServiceAction.DeepLinkResolved]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
	[DeepLinkServiceState.SwitchToRef]: {
		[DeepLinkServiceAction.OpenInspect]: DeepLinkServiceState.OpenInspect,
		[DeepLinkServiceAction.DeepLinkResolved]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkErrored]: DeepLinkServiceState.Idle,
		[DeepLinkServiceAction.DeepLinkCancelled]: DeepLinkServiceState.Idle,
	},
};

export interface DeepLinkProgress {
	message: string;
	increment: number;
}

export const deepLinkStateToProgress: Record<string, DeepLinkProgress> = {
	[DeepLinkServiceState.Idle]: { message: '完成。', increment: 100 },
	[DeepLinkServiceState.AccountCheck]: { message: '正在检查账户...', increment: 1 },
	[DeepLinkServiceState.PlanCheck]: { message: '正在检查计划...', increment: 2 },
	[DeepLinkServiceState.TypeMatch]: { message: '正在匹配链接类型...', increment: 5 },
	[DeepLinkServiceState.RepoMatch]: { message: '正在查找匹配的仓库...', increment: 10 },
	[DeepLinkServiceState.CloneOrAddRepo]: { message: '正在添加仓库...', increment: 20 },
	[DeepLinkServiceState.AddedRepoMatch]: { message: '正在查找匹配的仓库...', increment: 25 },
	[DeepLinkServiceState.RemoteMatch]: { message: '正在查找匹配的远程仓库...', increment: 30 },
	[DeepLinkServiceState.AddRemote]: { message: '正在添加远程仓库...', increment: 40 },
	[DeepLinkServiceState.TargetMatch]: { message: '正在查找匹配的目标...', increment: 50 },
	[DeepLinkServiceState.Fetch]: { message: '正在获取...', increment: 60 },
	[DeepLinkServiceState.FetchedTargetMatch]: { message: '正在查找匹配的目标...', increment: 65 },
	[DeepLinkServiceState.MaybeOpenRepo]: { message: '正在打开仓库...', increment: 70 },
	[DeepLinkServiceState.RepoOpening]: { message: '正在打开仓库...', increment: 75 },
	[DeepLinkServiceState.GoToTarget]: { message: '正在打开目标...', increment: 80 },
	[DeepLinkServiceState.OpenGraph]: { message: '正在打开图表...', increment: 90 },
	[DeepLinkServiceState.OpenComparison]: { message: '正在打开比较视图...', increment: 90 },
	[DeepLinkServiceState.OpenDraft]: { message: '正在打开云补丁...', increment: 90 },
	[DeepLinkServiceState.OpenWorkspace]: { message: '正在打开工作区...', increment: 90 },
	[DeepLinkServiceState.OpenFile]: { message: '正在打开文件...', increment: 90 },
	[DeepLinkServiceState.OpenInspect]: { message: '正在打开检查视图...', increment: 90 },
	[DeepLinkServiceState.SwitchToRef]: { message: '正在切换到引用...', increment: 90 },
};
