const http = require('http')
const downloadRepo = require('download-git-repo')
const querystring = require('querystring')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const resetRepo = () => {
  if (fs.existsSync(path.join(process.cwd(), 'repo'))) {
    execSync('rm -rf repo', { cwd: process.cwd() })
    console.log('\n\n---删除文件夹repo---')
  }

  execSync('mkdir repo', { cwd: process.cwd() })
  console.log('\n\n---创建文件夹repo---')
}

const clearContainer = () => {
  console.log('\n\n---删除可能存在的无用镜像---')
  execSync('docker rm -f blog_pre || true', { stdio: 'inherit' })
}

const buildImage = () => {
  execSync('docker build -t="blog" .', { cwd: path.join(process.cwd(), 'repo'), stdio: 'inherit' })
  console.log('\n\n---构建镜像成功，启动镜像---')
  execSync('docker run --name blog_pre -d -p 3000 blog', { stdio: 'inherit' })
  console.log('\n\n---镜像启动成功，展示端口号---')
}

const resetNginx = () => {
  const containerPort = execSync('docker port blog_pre').toString('utf8').split(':')[1]
  console.log(`\n\n---获取到最新容器运行端口:${containerPort}`)
  const conf = fs.readFileSync(`${path.join(process.cwd(), 'model', 'custom.conf')}`, 'utf8')
  console.log(`\n\n---替换nginx文件---`)
  fs.writeFileSync('/etc/nginx/conf.d/custom.conf', conf.replace('${blog_port}', containerPort))
  console.log('\n\n---写入成功，重启nginx---')
  execSync('nginx -s reload', { stdio: 'inherit' })
  console.log('\n\n---nginx重启成功---')
}

const resetContainer = () => {
  console.log('\n\n---删除旧容器---')
  execSync('docker rm -f blog_pro || true', { stdio: 'inherit' })
  console.log('\n\n---容器重命名---')
  execSync('docker rename blog_pre blog_pro', { stdio: 'inherit' })
}

const server = http.createServer((req, res) => {

  if (req.url === '/deploy') {
    try {
      resetRepo()
      console.log('\n\n---开始下载代码---')
      downloadRepo('zhangzhaoxu/blog', path.join(process.cwd(), 'repo'), (err) => {
        if (err) {
          console.log(err, 'err==========')
          res.end()
        } else {
          console.log('\n\n---下载完成，开始构建镜像---')
          clearContainer()
          buildImage()
          console.log('\n\n---项目已启动, 开始替换nginx文件---')
          resetNginx();
          resetContainer();
          console.log('\n\n---发布成功---')
          res.end(JSON.stringify({
            success: true,
            message: '发布成功',
          }))
        }
      })
    } catch (error) {
      res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
      res.write(error)
      res.end()
    }
  } else {
    res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
    res.write('这是怀朔博客的部署脚本~')
    res.end()
  }
})

server.listen(3333)

console.log('server listened at localhost:3333')