import { ThemeIcon, window } from 'vscode';
import type { OpenChangedFilesCommandArgs } from '../../commands/openChangedFiles';
import type { OpenOnlyChangedFilesCommandArgs } from '../../commands/openOnlyChangedFiles';
import { RevealInSideBarQuickInputButton, ShowDetailsViewQuickInputButton } from '../../commands/quickCommand.buttons';
import type { Keys } from '../../constants';
import { GlyphChars } from '../../constants';
import { Commands } from '../../constants.commands';
import { Container } from '../../container';
import { browseAtRevision } from '../../git/actions';
import * as CommitActions from '../../git/actions/commit';
import { CommitFormatter } from '../../git/formatters/commitFormatter';
import type { GitCommit } from '../../git/models/commit';
import type { GitFile, GitFileChange } from '../../git/models/file';
import { getGitFileFormattedDirectory, getGitFileStatusThemeIcon } from '../../git/models/file';
import type { GitStatusFile } from '../../git/models/status';
import { basename } from '../../system/path';
import { pad } from '../../system/string';
import type { CompareResultsNode } from '../../views/nodes/compareResultsNode';
import { CommandQuickPickItem } from './common';

export class CommitFilesQuickPickItem extends CommandQuickPickItem {
	constructor(
		readonly commit: GitCommit,
		options?: {
			file?: GitFileChange;
			unpublished?: boolean | undefined;
			picked?: boolean;
			hint?: string;
		},
	) {
		super(
			{
				label: commit.summary,
				description: `${CommitFormatter.fromTemplate(`\${author}, \${ago}  $(git-commit)  \${id}`, commit)}${
					options?.unpublished ? '  (unpublished)' : ''
				}`,
				detail: `${
					options?.file != null
						? `$(file) ${basename(options.file.path)}${options.file.formatStats({
								expand: true,
								separator: ', ',
								prefix: ` ${GlyphChars.Dot} `,
						  })}`
						: `$(files) ${commit.formatStats({
								expand: true,
								separator: ', ',
								empty: '无文件变更',
						  })}`
				}${options?.hint != null ? `${pad(GlyphChars.Dash, 4, 2, GlyphChars.Space)}${options.hint}` : ''}`,
				alwaysShow: true,
				picked: options?.picked ?? true,
				buttons: [ShowDetailsViewQuickInputButton, RevealInSideBarQuickInputButton],
			},
			undefined,
			undefined,
			undefined,
			{ suppressKeyPress: true },
		);
	}

	get sha(): string {
		return this.commit.sha;
	}
}

export class CommitFileQuickPickItem extends CommandQuickPickItem {
	constructor(
		readonly commit: GitCommit,
		readonly file: GitFile,
		picked?: boolean,
	) {
		super({
			label: basename(file.path),
			description: getGitFileFormattedDirectory(file, true),
			picked: picked,
			iconPath: getGitFileStatusThemeIcon(file.status),
		});

		// TODO@eamodio - add line diff details
		// this.detail = this.commit.getFormattedDiffStatus({ expand: true });
	}

	get sha(): string {
		return this.commit.sha;
	}

	override execute(options?: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.openChanges(this.file, this.commit, options);
		// const fileCommit = await this.commit.getCommitForFile(this.file)!;

		// if (fileCommit.previousSha === undefined) {
		// 	void (await findOrOpenEditor(
		// 		GitUri.toRevisionUri(fileCommit.sha, this.file, fileCommit.repoPath),
		// 		options,
		// 	));

		// 	return;
		// }

		// const commandArgs: DiffWithPreviousCommandArgs = {
		// 	commit: fileCommit,
		// 	showOptions: options,
		// };
		// void (await executeCommand(Commands.DiffWithPrevious, fileCommit.toGitUri(), commandArgs));
	}
}

export class CommitBrowseRepositoryFromHereCommandQuickPickItem extends CommandQuickPickItem {
	constructor(
		private readonly commit: GitCommit,
		private readonly executeOptions?: {
			before?: boolean;
			openInNewWindow: boolean;
		},
	) {
		super(
			`从这里${executeOptions?.before ? '之前' : ''}浏览仓库${
				executeOptions?.openInNewWindow ? '（在新窗口中）' : ''
			}`,
		);
		this.iconPath = new ThemeIcon('folder-opened');
	}

	override execute(_options: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return browseAtRevision(this.commit.getGitUri(), {
			before: this.executeOptions?.before,
			openInNewWindow: this.executeOptions?.openInNewWindow,
		});
	}
}

export class CommitCompareWithHEADCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('与 HEAD 比较');
		this.iconPath = new ThemeIcon('compare-changes');
	}

	override execute(_options: { preserveFocus?: boolean; preview?: boolean }): Promise<CompareResultsNode> {
		return Container.instance.searchAndCompareView.compare(this.commit.repoPath, this.commit.ref, 'HEAD');
	}
}

export class CommitCompareWithWorkingCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('与工作树比较', new ThemeIcon('compare-changes'));
	}

	override execute(_options: { preserveFocus?: boolean; preview?: boolean }): Promise<CompareResultsNode> {
		return Container.instance.searchAndCompareView.compare(this.commit.repoPath, this.commit.ref, '');
	}
}

export class CommitCopyIdQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('复制 SHA', new ThemeIcon('copy'));
	}

	override execute(): Promise<void> {
		return CommitActions.copyIdToClipboard(this.commit);
	}

	override async onDidPressKey(key: Keys): Promise<void> {
		await super.onDidPressKey(key);
		void window.showInformationMessage('提交 SHA 已复制到剪贴板');
	}
}

export class CommitCopyMessageQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('复制消息', new ThemeIcon('copy'));
	}

	override execute(): Promise<void> {
		return CommitActions.copyMessageToClipboard(this.commit);
	}

	override async onDidPressKey(key: Keys): Promise<void> {
		await super.onDidPressKey(key);
		void window.showInformationMessage(
			`${this.commit.stashName ? '储藏' : '提交'}消息已复制到剪贴板`,
		);
	}
}

export class CommitOpenAllChangesCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('打开所有更改', new ThemeIcon('git-compare'));
	}

	override execute(options: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.openAllChanges(this.commit, options);
	}
}

export class CommitOpenAllChangesWithDiffToolCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('打开所有更改（差异工具）', new ThemeIcon('git-compare'));
	}

	override execute(): Promise<void> {
		return CommitActions.openAllChangesWithDiffTool(this.commit);
	}
}

export class CommitOpenAllChangesWithWorkingCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('打开所有工作树更改', new ThemeIcon('git-compare'));
	}

	override execute(options: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.openAllChangesWithWorking(this.commit, options);
	}
}

export class CommitOpenChangesCommandQuickPickItem extends CommandQuickPickItem {
	constructor(
		private readonly commit: GitCommit,
		private readonly file: string | GitFile,
	) {
		super('打开更改', new ThemeIcon('git-compare'));
	}

	override execute(options: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.openChanges(this.file, this.commit, options);
	}
}

export class CommitOpenChangesWithDiffToolCommandQuickPickItem extends CommandQuickPickItem {
	constructor(
		private readonly commit: GitCommit,
		private readonly file: string | GitFile,
	) {
		super('打开更改（差异工具）', new ThemeIcon('git-compare'));
	}

	override execute(): Promise<void> {
		return CommitActions.openChangesWithDiffTool(this.file, this.commit);
	}
}

export class CommitOpenChangesWithWorkingCommandQuickPickItem extends CommandQuickPickItem {
	constructor(
		private readonly commit: GitCommit,
		private readonly file: string | GitFile,
	) {
		super('打开工作文件更改', new ThemeIcon('git-compare'));
	}

	override execute(options: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.openChangesWithWorking(this.file, this.commit, options);
	}
}

export class CommitOpenDirectoryCompareCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('打开目录比较', new ThemeIcon('git-compare'));
	}

	override execute(): Promise<void> {
		return CommitActions.openDirectoryCompareWithPrevious(this.commit);
	}
}

export class CommitOpenDirectoryCompareWithWorkingCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('打开工作树目录比较', new ThemeIcon('git-compare'));
	}

	override execute(): Promise<void> {
		return CommitActions.openDirectoryCompareWithWorking(this.commit);
	}
}

export class CommitOpenDetailsCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('检查提交详情', new ThemeIcon('eye'));
	}

	override execute(options: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.showDetailsView(this.commit, { preserveFocus: options?.preserveFocus });
	}
}

export class CommitOpenInGraphCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('在提交图中打开', new ThemeIcon('gitlens-graph'));
	}

	override execute(options: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.showInCommitGraph(this.commit, { preserveFocus: options?.preserveFocus });
	}
}

export class CommitOpenFilesCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('打开文件', new ThemeIcon('files'));
	}

	override execute(_options: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.openFiles(this.commit);
	}
}

export class CommitOpenFileCommandQuickPickItem extends CommandQuickPickItem {
	constructor(
		private readonly commit: GitCommit,
		private readonly file: string | GitFile,
	) {
		super('打开文件', new ThemeIcon('file'));
	}

	override execute(options?: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.openFile(this.file, this.commit, options);
	}
}

export class CommitOpenRevisionsCommandQuickPickItem extends CommandQuickPickItem {
	constructor(private readonly commit: GitCommit) {
		super('打开修订版本的文件', new ThemeIcon('files'));
	}

	override execute(_options: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.openFilesAtRevision(this.commit);
	}
}

export class CommitOpenRevisionCommandQuickPickItem extends CommandQuickPickItem {
	constructor(
		private readonly commit: GitCommit,
		private readonly file: string | GitFile,
	) {
		super('打开修订版本的文件', new ThemeIcon('file'));
	}

	override execute(options?: { preserveFocus?: boolean; preview?: boolean }): Promise<void> {
		return CommitActions.openFileAtRevision(this.file, this.commit, options);
	}
}

export class CommitApplyFileChangesCommandQuickPickItem extends CommandQuickPickItem {
	constructor(
		private readonly commit: GitCommit,
		private readonly file: string | GitFile,
	) {
		super('应用更改');
	}

	override async execute(): Promise<void> {
		return CommitActions.applyChanges(this.file, this.commit);
	}
}

export class CommitRestoreFileChangesCommandQuickPickItem extends CommandQuickPickItem {
	constructor(
		private readonly commit: GitCommit,
		private readonly file: string | GitFile,
	) {
		super({
			label: '还原',
			description: '即检出',
		});
	}

	override execute(): Promise<void> {
		return CommitActions.restoreFile(this.file, this.commit);
	}
}

export class OpenChangedFilesCommandQuickPickItem extends CommandQuickPickItem {
	constructor(files: GitStatusFile[], label?: string) {
		const commandArgs: OpenChangedFilesCommandArgs = {
			uris: files.map(f => f.uri),
		};

		super(label ?? '打开所有已更改文件', new ThemeIcon('files'), Commands.OpenChangedFiles, [commandArgs]);
	}
}

export class OpenOnlyChangedFilesCommandQuickPickItem extends CommandQuickPickItem {
	constructor(files: GitStatusFile[], label?: string) {
		const commandArgs: OpenOnlyChangedFilesCommandArgs = {
			uris: files.map(f => f.uri),
		};

		super(label ?? '打开已更改文件并关闭未更改文件', new ThemeIcon('files'), Commands.OpenOnlyChangedFiles, [
			commandArgs,
		]);
	}
}
