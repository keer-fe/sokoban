// Log only API diagnostics, never friend records or identity data.
export function apiError(method, source) {
  const message = source && (source.errMsg || source.message) || '接口调用失败，未返回原因';
  const error = new Error(String(message));
  error.api = method;
  error.code = source && (source.errCode ?? source.errcode ?? source.code);
  return error;
}

export function explainError(error) {
  const message = error && error.message || '未返回具体原因';
  let hint = '请查看开放数据域控制台的具体错误';
  if (/please go to mp to announce your privacy usage/i.test(message)) hint = '请在微信公众平台补充隐私信息用途声明';
  else if (/unavailable|not a function|not support|不支持/i.test(message)) hint = '当前环境不支持该接口，请使用手机预览';
  else if (/auth|permission|scope|授权|权限|privacy|隐私/i.test(message)) hint = '微信权限或隐私配置未满足，请检查具体错误';
  else if (/timeout|timed out|network|网络|超时/i.test(message)) hint = '网络连接失败或超时，请稍后刷新';
  const code = error && error.code !== undefined ? `错误码 ${error.code} · ` : '';
  return { hint, detail: `${code}${message}` };
}

export function needsPrivacyDeclaration(error) {
  return /please go to mp to announce your privacy usage/i.test(error && error.message || '');
}
