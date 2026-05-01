const mammoth = require('mammoth');

async function run() {
  try {
    const arr = new Uint8Array(10);
    console.log("Testing { buffer: ... }");
    await mammoth.extractRawText({ buffer: Buffer.from(arr) });
    console.log("buffer worked (or threw a valid DOCX error)");
  } catch (e) {
    console.log("buffer error:", e.message);
  }

  try {
    const arr = new Uint8Array(10);
    console.log("Testing { arrayBuffer: ... }");
    await mammoth.extractRawText({ arrayBuffer: arr.buffer });
    console.log("arrayBuffer worked");
  } catch (e) {
    console.log("arrayBuffer error:", e.message);
  }
}

run();
