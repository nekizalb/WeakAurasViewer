var table = "t=";
var auraTable;


//following function from
//http://www.deanmao.com/2012/08/09/converting-lua-code-into-json-via-js/
//var esprima = require('esprima');
function jsonExtractor(source) {
  var root = esprima.parse(source);
  var array = []
  function traverse(node, obj, key) {
    var child, visited = false;

    if (node.type === 'TableAssignmentExpression') {
      var name = node.left.value;
      if (node.right.type === 'Literal') {
        obj[name] = node.right.value;
      } else if (node.right.elements) {
        if (name) {
          visited = true;
          obj[name] = traverse(node.right.elements, {})
        }
      }
    }

    if (!visited) {
      for (key in node) {
        if (node.hasOwnProperty(key)) {
          child = node[key];
          if (typeof child === 'object' && child !== null) {
            if (key === 'elements') {
              var x = traverse(child, {}, key);
              if (!x.frames) {
                array.push(x);
              }
            } else {
              traverse(child, obj, key);
            }
          }
        }
      }
    }

    return obj;
  }
  traverse(root);
  return array;
}

function formatLiteral(literal){
	switch(typeof literal){
		case "string":
		  return "\"" + literal.replace(/\n/g,"\\n").replace(/\"/g,"\\\"")  + "\"";
		case "number":
		case "boolean":
		  return literal;
	}
}

function auraToString(node, indent){
	var ret = indent;
	switch(node.type){
		case "TableAssignmentExpression":
		  ret += node.left.value + " = ";
		  switch(node.right.type){
			  case "Literal":
		        return ret + formatLiteral(node.right.value) + ",\n";
			    break;
			  case "ArrayExpression":
				if(node.right.elements.length == 0){
					return ret + "{},\n";
				}else{
			        ret += "{\n";
					for(var i=0; i < node.right.elements.length; i++){
						ret += auraToString(node.right.elements[i], indent + "  ");
					}
				return ret + indent + "},\n"
				}
			    break;
		      case "UnaryExpression":
			    return ret + node.right.operator + formatLiteral(node.right.argument.value) + ",\n";
			
			    break;
			  default:
			    throw "unhandled type (TableAssignmentExpression.right.type):" + node.right.type;
		  } 
		  break;
		default:
			throw "unhandled type(node.type):" + node.type;
	}
}

function PageLoad(){
  var pastebinCode = location.search.split('pastebin=')[1];
  if(pastebinCode != undefined && pastebinCode.length > 0){
    document.getElementById("inputCode").value = pastebinCode;
    FetchPasteBin();
  }
}

function LoadPasteBinAura(){
  var pastebinCode = document.getElementById("inputCode").value
  location.search = "pastebin=" + pastebinCode;
  
}

function FetchPasteBin(){
  
  if(pastebinCode.length != 0){
    $('#container').load('http://google.com');
    
    $.ajax({
      url: 'http://pastebin.com/' + document.getElementById("inputCode").value,
      type: 'GET',
      success: function(res) {
     	var headline = $(res.responseText).find('textarea.paste_code').text();
      	DecodeAura(headline);
      }
    });
  }
}


function DecodeAura(input){
	
  //var input = document.getElementById("inputCode").value;
  var output = document.getElementById("rawLuaTableContent");
  output.innerHTML="";
  table="";
  
  if (input.length == 0) return;
  
  var decoded = "";
  
  var b64Key = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()";
  var working = 0;
  var bits = 0;
  var pad = "00000000"
  
  for (i = 0; i < input.length; i++) { 
	
	  var value = b64Key.indexOf(input[i]);
    //output.innerHTML += value + "<br />"
	  working += value << bits;
    //output.innerHTML += working + "<br />"
	  bits += 6;
    //output.innerHTML += "<br />"
    //if(i > 10) break;
    if(bits > 8){
		  var  str= (working & 0xFF).toString(2);
      //output.innerHTML += "str: " + str + "<br />"
      decoded += pad.substring(0, pad.length - str.length) + str;
      working = working >> 8;
      bits -= 8;
    }
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
  
  
  //decode huffman map
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
  
  
  //use huffman map to decode rest of string
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
        if (offset > decoded.length) break;
        bitfield = decoded.substr(offset, 8) + bitfield;
        offset += 8;
    }
  }
   output.innerHTML += decode + "<br />"
  
  //un-escape the lua table
  var regex = /\^(.)([^^]*)/g; //escapte codes take the form ^{1char code}{value}
  var indent = "";
  var key = true;
  var match = regex.exec(decode);
  var matches = new Array();
  while(match != null){
    matches.push(match);
    match = regex.exec(decode);
  }
  //output.innerHTML += "<pre>";
  for(i = 1; i < matches.length; i++){
    //output.innerHTML += match[1] + " " + match[2] +"<br />";
    switch(matches[i][1]){
      case "T":
        if(!key && matches[i+1][1] == "t"){
          output.innerHTML += (key ? indent : "") + "{},\n";
          table += "{},\n";
          i++;
        }
        else{
          output.innerHTML += (key ? indent : "") + "{\n";
          table += "{\n";
          indent += "  ";
        }
        key = false;
        break;
      case "t":
        indent = indent.slice(2);
		if(indent.length == 0){
          output.innerHTML += (key ? indent : "") + "}\n";
          table += "}\n";
		} else{
          output.innerHTML += (key ? indent : "") + "},\n";
          table += "},\n";
		}
        key = false;
        break;
      case "S":
        var parsed = matches[i][2];
        parsed = parsed.replace(/~\|/g,"~").replace(/~}/g, "^").replace(/~`/g, " ").replace(/~J/g, "\n").replace(/\r/g,"\n").replace(/\"/g,"\\\"")
        while(parsed.indexOf("\n\n\n") != -1){parsed = parsed.replace(/\n\n\n/g,"\n\n")}
        output.innerHTML += (key ? indent + "" : "\"") + parsed + (key ? " = " : "\",\n");
        table += "\"" +parsed.replace(/\n/g,"\\n") + (key ? "\" = " : "\",\n");
        break;
      case "N":
        output.innerHTML += (key ? indent : "") + matches[i][2] + (key ? " = " : ",\n")
        table += matches[i][2] + (key ? " = " : ",\n");
        break;
      case "b":
        output.innerHTML += (key ? indent : "") + "false" + (key ? " = " : ",\n")
        table += "false" + (key ? " = " : ",\n");
        break;
      case "B":
        output.innerHTML += (key ? indent : "") + "true" + (key ? " = " : ",\n")
        table += "true" + (key ? " = " : ",\n");
        break;
      case "F":
        var mantissa = matches[i][2];
        var exponent = matches[++i][2];
        var result = mantissa * Math.pow(2,exponent);
        output.innerHTML += (key ? indent : "") + result + (key ? " = " : ",\n")
        table += result + (key ? " = " : ",\n");
        break;

    }
    key = !key;
  }
  //output.innerHTML += "}<br />";
  hljs.highlightBlock(output);
  //table += "}";
  auraTable = esprima.parse(table);
  document.getElementById("customFunctionsContent").innerHTML = auraToString(auraTable.body[0].expression.elements[4], "")
  hljs.highlightBlock(document.getElementById("customFunctionsContent"));
}





































































