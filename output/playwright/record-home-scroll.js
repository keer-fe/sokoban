async (page) => {
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await page.evaluate(() => new Promise((resolve, reject) => {
    const canvas = document.getElementById('normal');
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1800000 });
    const chunks = [];
    const scene = window.previews.normal.page.layout.scene;
    const roadHeight = Math.min(280, scene.height * .93);
    const twoLoops = roadHeight * 2086 / 754 * 4 / 26;
    const realSeconds = 12;
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = reject;
    recorder.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'home-scroll-v7-two-loops.webm';
      document.body.append(link);
      link.click();
      link.remove();
      stream.getTracks().forEach(track => track.stop());
      resolve();
    };
    const start = performance.now();
    recorder.start();
    const step = now => {
      const progress = Math.min(1, (now - start) / (realSeconds * 1000));
      window.setPhase(twoLoops * progress);
      if (progress < 1) requestAnimationFrame(step);
      else recorder.stop();
    };
    requestAnimationFrame(step);
  }));
  const download = await downloadPromise;
  await download.saveAs('output/playwright/home-scroll-v7-two-loops.webm');
}
