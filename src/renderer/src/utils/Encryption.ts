import CryptoJS from 'crypto-js';

/**
 * 接口数据加密函数
 * @param str string 需加密的json字符串
 * @param key string 加密key(16位)
 * @param iv string 加密向量(16位)
 * @return string 加密密文字符串
 */
export function js_encrypt(str :any, key:any, iv:any) {
//密钥16位
    key = CryptoJS.enc.Utf8.parse(key);
//加密向量16位
    iv = CryptoJS.enc.Utf8.parse(iv);
    let encrypted = CryptoJS.AES.encrypt(str, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    return encrypted.toString();
}

/**
 * 接口数据解密函数
 * @param str string 已加密密文
 * @param key string 加密key(16位)
 * @param iv string 加密向量(16位)
 * @returns {*|string} 解密之后的json字符串
 */
export function js_decrypt(str :any, key:any, iv:any) {

//密钥16位
    key = CryptoJS.enc.Utf8.parse(key);
//加密向量16位
    iv = CryptoJS.enc.Utf8.parse(iv);
    let decrypted = CryptoJS.AES.decrypt(str, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8);

    return decrypted;
}
