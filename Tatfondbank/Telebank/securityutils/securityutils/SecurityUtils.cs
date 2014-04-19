using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Security;
using System.Security.Cryptography;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;
using System.Net;

namespace Infratel {
    public class SecurityUtils {
        System.Security.Cryptography.MD5 _md5 = System.Security.Cryptography.MD5.Create();
        public int MD5(string src) {
            var enc = new UTF8Encoding();
            return BitConverter.ToInt32(_md5.ComputeHash( enc.GetBytes(src ) ),0 );
        }
        public int MD5WithSalt(string src, string saltS) {
            var enc = new UTF8Encoding();
            byte[] salt = enc.GetBytes(saltS);
            DeriveBytes rgb = new Rfc2898DeriveBytes(src, salt);
            return BitConverter.ToInt32(_md5.ComputeHash(rgb.GetBytes(salt.Length + src.Length)), 0);
        }

        public static string ByteArrayToString(byte[] ba) {
            StringBuilder hex = new StringBuilder(ba.Length * 2);
            foreach (byte b in ba)
                hex.AppendFormat("{0:x2}", b);
            return hex.ToString();
        }
        public static byte[] StringToByteArray(string s) {
            byte[] res = new byte[s.Length / 2];
            for (var i = 0; i < s.Length; i += 2) {
                res[i/2]  = Convert.ToByte(s.Substring(i, 2),16);
            }
            return res;
        }
        public static void StringToByteArray(string s, ref byte[] res, int offset) {
            for (var i = 0; i < s.Length; i += 2) {
                res[offset+i/2]  = Convert.ToByte(s.Substring(i, 2),16);
            }
        }

        private static string Encrypt<T>(string value, string password, string saltsS, int iterationCount)
             where T : SymmetricAlgorithm, new() {
            var enc = new UTF8Encoding();
            byte[] salt = enc.GetBytes(saltsS);
            DeriveBytes rgb = new Rfc2898DeriveBytes(password, salt, iterationCount);

            SymmetricAlgorithm algorithm = new T();

            byte[] rgbKey = rgb.GetBytes(algorithm.KeySize >> 3);
            byte[] rgbIV = rgb.GetBytes(algorithm.BlockSize >> 3);
            ICryptoTransform transform = algorithm.CreateEncryptor(rgbKey, rgbIV);
            using (MemoryStream buffer = new MemoryStream()) {
                using (CryptoStream stream = new CryptoStream(buffer, transform, CryptoStreamMode.Write)) {
                    var b = enc.GetBytes(value );
                    stream.Write(b, 0, b.Length);
                }
                return ByteArrayToString(buffer.ToArray());
            }
        }
        public string TripleDES(string src, string password, string salt, int iterationCount) {
            return Encrypt<TripleDESCryptoServiceProvider>(src, password, salt, iterationCount); 
        }

        public string CreatePINBlock(string pinCode, string PAN, string TPKClearIn) {
            var TPKClear = TPKClearIn.PadLeft(32, '0');
            var key = new byte[24];
            StringToByteArray(TPKClear.Substring(0, 16), ref key, 0); //pack('H*', substr( $TPKClear, 0, 16 ) );
            StringToByteArray(TPKClear.Substring(16, 16), ref key, 8); //pack('H*', substr( $TPKClear, 16, 16 ) );
            for (var i = 0; i < 8; ++i) {
                key[i + 16] = key[i];
            }
            var str1 = (string.Format("{0:x2}", pinCode.Length) + pinCode).PadRight(16, 'F');//str_pad( bin2hex(chr(strlen($pinCode))).$pinCode, 16, "F" );
            var str2 = "0000" + PAN.Substring(PAN.Length - 13, 12); // substr( "0000".substr($PAN,-13), 0, -1 );
            var str3 = string.Format("{0:X}", Convert.ToUInt64(str1, 16) ^ Convert.ToUInt64(str2, 16)).PadLeft(16, '0');

            SymmetricAlgorithm algorithm = new TripleDESCryptoServiceProvider();

            byte[] value = StringToByteArray(str3);
            byte[] outp = new byte[8];
            byte[] iv = new byte[] { 0, 0, 0, 0, 0, 0, 0, 0 };
            ICryptoTransform transform = algorithm.CreateEncryptor(key, iv);
            transform.TransformBlock(value, 0, 8, outp, 0);
            return ByteArrayToString(outp.ToArray());
        }

        public string SendRequest(string url, string method, string postData) {
            string webpageContent = string.Empty;

            HttpWebRequest webRequest = (HttpWebRequest)WebRequest.Create(url);
            webRequest.Method = method;
            webRequest.ContentType = "application/x-www-form-urlencoded";
            if (method == "POST") {
                byte[] byteArray = Encoding.UTF8.GetBytes(postData);
                webRequest.ContentLength = byteArray.Length;
                using (Stream webpageStream = webRequest.GetRequestStream()) {
                    webpageStream.Write(byteArray, 0, byteArray.Length);
                }
            };

            using (HttpWebResponse webResponse = (HttpWebResponse)webRequest.GetResponse()) {
                using (StreamReader reader = new StreamReader(webResponse.GetResponseStream())) {
                    webpageContent = reader.ReadToEnd();
                }
            }

            return webpageContent;
        }
    }
}
