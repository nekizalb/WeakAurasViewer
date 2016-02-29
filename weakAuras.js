function DecodeAura(){
  var input = document.getElementById("inputCode").innerHTML;
  var output = document.getElementById("outputTable");
  
  var decoded = "";
  
  var b64Key = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()";
  var working = 0;
  var bits = 0;
  var pad = "00000000"
  
  for (i = 0; i < input.length; i++) { 
    if(bits > 8){
		  var  str= (working & 0xFF).toString(2);
      //output.innerHTML += "str: " + str + "<br />"
      decoded += pad.substring(0, pad.length - str.length) + str;
      working = working >> 8;
      bits -= 8;
    }
	
	  var value = b64Key.indexOf(input[i]);
    //output.innerHTML += value + "<br />"
	  working += value << bits;
    //output.innerHTML += working + "<br />"
	  bits += 6;
    //output.innerHTML += "<br />"
    //if(i > 10) break;
  }

  var info_byte = parseInt(decoded.substr(0*8,8),2);
  var num_symbols = parseInt(decoded.substr(1*8,8),2)+1;
  var c0 = parseInt(decoded.substr(2*8,8),2);
  var c1 = parseInt(decoded.substr(3*8,8),2);
  var c2 = parseInt(decoded.substr(4*8,8),2);
  var orig_size = c2 * 65536 + c1 * 256 + c0;
  
  var minCodeLen = 1000, maxCodeLen = 0, offset = 5 * 8, n = 0;
  var bitfield = "";
  var symbolState = true;
  var symbol = "";
  bits = 0;
  
  var map = new Array();
  while (n < num_symbols){
    bitfield = decoded.substr(offset,8) + bitfield;
    offset += 8;
    
    if(symbolState){
      symbol = String.fromCharCode(parseInt(bitfield.substr(bitfield.length - 8, 8), 2));
      bitfield = bitfield.substr(0, bitfield.length - 8);
      symbolState = false;
    }
    else{
      if(bitfield.lastIndexOf("11") != -1){
        var code = bitfield.substr(bitfield.lastIndexOf("11") + 2);
        bitfield = bitfield.substr(0,bitfield.lastIndexOf("11"));
        var precode = code
        code = code.replace(/01/g,"1");
        map[code]=symbol;
        minCodeLen = Math.min(minCodeLen, code.length);
        maxCodeLen = Math.max(maxCodeLen, code.length);
        symbolState = true;
        n++;
      }
    }
  }
  
  var testLength = minCodeLen;
  var testCode
  var decode = "";
  while(true){
    if (testLength <= bitfield.length)
    {
        testCode = bitfield.substr(bitfield.length - testLength);
        if (testCode in map)
        {
            decode += map[testCode];
            bitfield = bitfield.substr(0, bitfield.length - testLength);
            testLength = minCodeLen;
        }
        else
        {
            testLength++;
        }
    }
    else
    {
        if (offset >= decoded.length) break;
        bitfield = decoded.substr(offset, 8) + bitfield;
        offset += 8;
    }
  }
  
  output.innerHTML += decode;
}