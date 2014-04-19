using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Security;
using System.Security.Cryptography;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;

namespace pinblock {
    class Program {
        public static string ByteArrayToString(byte[] ba) {
            StringBuilder hex = new StringBuilder(ba.Length * 2);
            foreach (byte b in ba)
                hex.AppendFormat("{0:x2}", b);
            return hex.ToString();
        }
        public static byte[] StringToByteArray(string s) {
            byte[] res = new byte[s.Length / 2];
            for (var i = 0; i < s.Length; i += 2) {
                res[i / 2] = Convert.ToByte(s.Substring(i, 2), 16);
            }
            return res;
        }
        public static void StringToByteArray(string s, ref byte[] res, int offset) {
            for (var i = 0; i < s.Length; i += 2) {
                res[offset + i / 2] = Convert.ToByte(s.Substring(i, 2), 16);
            }
        }

        static void Main(string[] args) {


            var pinCode = "1234";
            var PAN = "676196000132392730";
            var TPKClearIn = "C023D15EF4604578F4337D69EF4A7EA";
            var TPKClear = TPKClearIn.PadLeft(32, '0');
            var key = new byte[24];

            StringToByteArray(TPKClear.Substring(0, 16),ref key,0); //pack('H*', substr( $TPKClear, 0, 16 ) );
            StringToByteArray(TPKClear.Substring(16, 16), ref key, 8); //pack('H*', substr( $TPKClear, 16, 16 ) );
            for (var i = 0; i < 8; ++i) {
                key[i + 16] = key[i];
            }
            Console.WriteLine(ByteArrayToString(key));
            var str1 = (string.Format("{0:x2}", pinCode.Length) + pinCode ).PadRight(16,'F');//str_pad( bin2hex(chr(strlen($pinCode))).$pinCode, 16, "F" );
            Console.WriteLine(str1);
            var str2= "0000" + PAN.Substring(PAN.Length-13,12); // substr( "0000".substr($PAN,-13), 0, -1 );
            Console.WriteLine(str2);
            //str_pad( gmp_strval( gmp_xor( gmp_init($str1,16),gmp_init($str2,16) ), 16), 16, "0", STR_PAD_LEFT );
            var str3 = string.Format("{0:X}",Convert.ToUInt64(str1,16) ^ Convert.ToUInt64(str2,16)).PadLeft(16,'0');
            Console.WriteLine(str3);

            SymmetricAlgorithm algorithm = new TripleDESCryptoServiceProvider();

            byte[] value = StringToByteArray(str3);
            byte[] outp = new byte[8]; 
            byte[] iv = new byte[] { 0, 0, 0, 0, 0, 0, 0, 0 };
            ICryptoTransform transform = algorithm.CreateEncryptor(key, iv);
            transform.TransformBlock(value, 0, 8, outp, 0);
            Console.WriteLine(ByteArrayToString(outp.ToArray()));
        }
    }
}

