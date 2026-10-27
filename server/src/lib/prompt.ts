import readline from 'node:readline';

export function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Chỉ in câu hỏi và dấu xuống dòng, không in lại ký tự gõ vào.
      rl._writeToOutput = (str) => {
        if (str.includes(question)) process.stdout.write(question);
        else if (/[\r\n]/.test(str)) process.stdout.write('\n');
      };
    }
    rl.question(question, (answer) => { rl.close(); resolve(answer); });
  });
}