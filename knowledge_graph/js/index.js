/*
* @Author: ZZQ
* @Date:   2018-11-08 13:35:34
* @Last Modified by:   ZZQ
* @Last Modified time: 2018-11-08 13:36:56
*/
function setThesis(){
                var file = $("#doc").val();
                var ext = file.slice(file.lastIndexOf(".")+1).toLowerCase();  
                if ("txt" != ext) {  
                    alert("只能上传txt文件");  
                    return false;  
                }  
                else {  
                    var fileName = getFileName(file);
                    function getFileName(o){
                        var pos=o.lastIndexOf("\\");
                        return o.substring(pos+1);  
                    }
                    $("#docname").html("已上传文献："+fileName);
                }    
                
            }