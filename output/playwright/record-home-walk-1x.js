async (page) => {
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.evaluate(() => new Promise((resolve, reject) => {
    const canvas = document.getElementById('normal');
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1800000 });
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = reject;
    recorder.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'home-scroll-walk-v7-1x.webm';
      document.body.append(link);
      link.click();
      link.remove();
      stream.getTracks().forEach(track => track.stop());
      resolve();
    };
    const start = performance.now();
    recorder.start();
    const step = now => {
      const time = Math.min(6, (now - start) / 1000);
      window.setPhase(time);
      if (time < 6) requestAnimationFrame(step);
      else recorder.stop();
    };
    requestAnimationFrame(step);
  }));
  const download = await downloadPromise;
  await download.saveAs('output/playwright/home-scroll-walk-v7-1x.webm');
}
