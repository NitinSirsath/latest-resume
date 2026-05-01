import mammoth from "npm:mammoth@1.8.0";
import { Buffer } from "node:buffer";

async function test() {
  const url = "https://njzvyfvnxjxewcdsncvb.supabase.co/storage/v1/object/public/resumes/resumes/106fb6d7-6a45-461d-b576-4f2d8cec5608/0.4651455332132963.docx";
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  
  try {
    const res1 = await mammoth.extractRawText({ arrayBuffer: ab });
    console.log("arrayBuffer worked:", res1.value.substring(0, 20));
  } catch(e: any) {
    console.log("arrayBuffer failed:", e.message);
  }

  try {
    const res2 = await mammoth.extractRawText({ buffer: Buffer.from(ab) });
    console.log("Buffer.from worked:", res2.value.substring(0, 20));
  } catch(e: any) {
    console.log("Buffer.from failed:", e.message);
  }

  try {
    const res3 = await mammoth.extractRawText({ buffer: new Uint8Array(ab) });
    console.log("Uint8Array worked:", res3.value.substring(0, 20));
  } catch(e: any) {
    console.log("Uint8Array failed:", e.message);
  }
}

test();
