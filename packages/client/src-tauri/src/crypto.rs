use aes_gcm::{Aes256Gcm, KeyInit, Nonce, aead::Aead};
use base64::{Engine as _, engine::general_purpose};
use getrandom::getrandom;
use tauri::command;

// 编译时嵌入加密密钥（如果文件不存在，使用默认密钥）
static ENCRYPTION_KEY: &[u8; 32] = include_bytes!("../encryption.key");

/// 加密 API Key
#[command]
pub fn encrypt_api_key(plain_text: String) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(ENCRYPTION_KEY)
        .map_err(|e| format!("Failed to initialize cipher: {}", e))?;
    
    // 生成随机 nonce
    let mut nonce_bytes = [0u8; 12];
    getrandom(&mut nonce_bytes).map_err(|e| format!("Failed to generate nonce: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    // 加密
    let ciphertext = cipher.encrypt(nonce, plain_text.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    
    // 组合 nonce + ciphertext 并编码为 base64
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    
    Ok(general_purpose::STANDARD.encode(&combined))
}

/// 解密 API Key
#[command]
pub fn decrypt_api_key(encrypted_text: String) -> Result<String, String> {
    // 解码 base64
    let combined = general_purpose::STANDARD.decode(&encrypted_text)
        .map_err(|e| format!("Failed to decode: {}", e))?;
    
    if combined.len() < 12 {
        return Err("Invalid encrypted data".to_string());
    }
    
    // 分离 nonce 和 ciphertext
    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    // 初始化解密器
    let cipher = Aes256Gcm::new_from_slice(ENCRYPTION_KEY)
        .map_err(|e| format!("Failed to initialize cipher: {}", e))?;
    
    // 解密
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    
    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let original = "sk-test-123456789";
        let encrypted = encrypt_api_key(original.to_string()).unwrap();
        let decrypted = decrypt_api_key(encrypted).unwrap();
        
        assert_eq!(original, decrypted);
    }

    #[test]
    fn test_encrypt_different_each_time() {
        let original = "sk-test-123456789";
        let encrypted1 = encrypt_api_key(original.to_string()).unwrap();
        let encrypted2 = encrypt_api_key(original.to_string()).unwrap();
        
        // 由于随机 nonce，每次加密结果不同
        assert_ne!(encrypted1, encrypted2);
        
        // 但解密后应该相同
        let decrypted1 = decrypt_api_key(encrypted1).unwrap();
        let decrypted2 = decrypt_api_key(encrypted2).unwrap();
        assert_eq!(decrypted1, decrypted2);
    }
}
