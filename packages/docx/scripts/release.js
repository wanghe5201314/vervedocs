import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const pkgPath = path.resolve('package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

// 校验包合法性
const ensureFileExists = (filePath) => {
  fs.accessSync(path.resolve(filePath), fs.constants.F_OK)
}

const ensureDistArtifacts = () => {
  const required = [pkg.module, pkg.main, pkg.typings].filter(Boolean)
  if (pkg?.exports?.['./ui']) {
    const uiExport = pkg.exports['./ui']
    required.push(uiExport.import, uiExport.require, uiExport.types)
  }
  try {
    ensureFileExists('dist')
    required.forEach(ensureFileExists)
  } catch {
    execSync('npm run -s build', { stdio: 'inherit' })
    ensureFileExists('dist')
    required.forEach(ensureFileExists)
  }
}

ensureDistArtifacts()

// 缓存项目package.json
const sourcePkg = fs.readFileSync(pkgPath, 'utf-8')
const isDryRun = process.argv.includes('--dry-run')

// 删除无用属性
const targetPkg = JSON.parse(sourcePkg)
Reflect.deleteProperty(targetPkg, 'dependencies')
Reflect.deleteProperty(targetPkg.scripts, 'postinstall')
fs.writeFileSync(pkgPath, JSON.stringify(targetPkg, null, 2))

// 发布包
try {
  const publishCommand = isDryRun ? 'npm publish --dry-run' : 'npm publish'
  execSync(publishCommand, { stdio: 'inherit' })
} finally {
  // 还原
  fs.writeFileSync(pkgPath, sourcePkg)
}
