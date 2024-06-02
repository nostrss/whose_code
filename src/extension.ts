import * as vscode from 'vscode'

let githubProfileName: string | undefined

export function activate(context: vscode.ExtensionContext) {
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('github-codeowner-checker.githubProfileName')) {
      githubProfileName = vscode.workspace
        .getConfiguration('github-codeowner-checker')
        .get('githubProfileName')
    }
  })

  githubProfileName = vscode.workspace
    .getConfiguration('github-codeowner-checker')
    .get('githubProfileName')

  vscode.window.showInformationMessage(`your name is ${githubProfileName}`)

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      checkCodeOwners(editor.document.fileName)
    }
  })

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.checkCodeOwners', () => {
      const editor = vscode.window.activeTextEditor
      if (editor) {
        checkCodeOwners(editor.document.fileName)
      }
    })
  )

  // 앱이 실행될 때 바로 checkCodeOwners 커맨드를 실행
  if (vscode.window.activeTextEditor) {
    checkCodeOwners(vscode.window.activeTextEditor.document.fileName)
  }

  vscode.window.showInformationMessage(
    'Extension "github-codeowner-checker" is now active!'
  )
}

async function checkCodeOwners(fileName: string) {
  // 설정에 자기 아이디가 없는 경우 메시지 노출
  if (!githubProfileName) {
    vscode.window.showWarningMessage(
      'GitHub profile name is not set. Please configure it in the settings.'
    )
    return
  }

  const codeOwnersFiles = await vscode.workspace.findFiles('**/CODEOWNERS')
  vscode.window.showInformationMessage(`${codeOwnersFiles}`)

  if (codeOwnersFiles.length === 0) {
    vscode.window.showInformationMessage(
      'No CODEOWNERS file found in the workspace.'
    )
    return
  }

  let isOwner = false
  const relativeFileName = vscode.workspace.asRelativePath(fileName, false)
  console.log('Relative file name:', relativeFileName)

  for (const file of codeOwnersFiles) {
    const content = (await vscode.workspace.openTextDocument(file)).getText()
    const lines = content.split(/\r?\n/)
    const codeOwnersDir = vscode.workspace
      .asRelativePath(file, false)
      .replace(/\/CODEOWNERS$/, '')

    console.log('Checking file:', relativeFileName)
    console.log('Against CODEOWNERS directory:', codeOwnersDir)

    if (relativeFileName.startsWith(codeOwnersDir)) {
      console.log('File is under the CODEOWNERS directory:', codeOwnersDir)

      for (const line of lines) {
        if (line.trim() && !line.startsWith('#')) {
          const parts = line.split(/\s+/)
          if (parts.length >= 2) {
            const pattern = parts[0]
            console.log('Pattern:', pattern)
            console.log('Owners:', parts.slice(1))

            if (
              pattern === '*' ||
              relativeFileName.match(new RegExp(pattern))
            ) {
              if (parts.slice(1).includes(githubProfileName)) {
                isOwner = true
                console.log('User is owner')
                break
              }
            }
          }
        }
      }

      if (isOwner) {
        break
      }
    }
  }

  if (!isOwner) {
    vscode.window.setStatusBarMessage(
      `You are not listed as a code owner for this file`,
      5000
    )
  } else {
    vscode.window.setStatusBarMessage(
      `You are listed as a code owner for this file`,
      5000
    )
  }
}

export function deactivate() {}
