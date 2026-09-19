// 复现：多路输出包了异步下游之后，flush 的回调立刻返回，文件里还一行没有
const pino = require('../');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsbfl'));
const d1 = pino.destination({ dest: path.join(dir, 'a.log'), sync: false, minLength: 4096 });
const d2 = pino.destination({ dest: path.join(dir, 'b.log'), sync: false, minLength: 4096 });
const log = pino({}, pino.multistream([d1, d2]));

for (let i = 0; i < 300; i++) log.info('line ' + i + ' ' + 'x'.repeat(60));

let cb = 0;
log.flush(() => { cb++; });

const count = (f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).length;
console.log('flush 回调返回时：次数 =', cb, '| a.log 行数 =', count('a.log'), '| b.log 行数 =', count('b.log'), '（各写了 300 行）');

setTimeout(() => {
  console.log('等 300ms 后：a.log 行数 =', count('a.log'), '| 回调次数 =', cb);
  console.log('不带回调的 flush 会不会抛：', (() => { try { log.flush(); return '不抛'; } catch (e) { return '抛 ' + e.message.slice(0, 40); } })());
  console.log('flush 的返回值 =', typeof log.flush(() => {}));
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(0);
}, 300);
