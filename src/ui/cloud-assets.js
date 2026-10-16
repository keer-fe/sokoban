export const CLOUD_BUCKET = '636c-cloud1-d5gqpaioo2d8acf27-1443887035';
export const CLOUD_UI_ROOT =
  `cloud://cloud1-d5gqpaioo2d8acf27.${CLOUD_BUCKET}/images/ui`;
export const PUBLIC_UI_ROOT = `https://${CLOUD_BUCKET}.tcb.qcloud.la/images/ui`;
export const CLOUD_IMAGES_ROOT =
  `cloud://cloud1-d5gqpaioo2d8acf27.${CLOUD_BUCKET}/images`;
export const PUBLIC_IMAGES_ROOT = `https://${CLOUD_BUCKET}.tcb.qcloud.la/images`;

export const cloudUIFileID = (filename) => `${CLOUD_UI_ROOT}/${filename}`;
export const publicUISource = (filename) => `${PUBLIC_UI_ROOT}/${filename}`;
export const cloudImageFileID = (path) => `${CLOUD_IMAGES_ROOT}/${path}`;
export const publicImageSource = (path) => `${PUBLIC_IMAGES_ROOT}/${path}`;
