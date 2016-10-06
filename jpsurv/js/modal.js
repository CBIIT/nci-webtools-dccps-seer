

$('#Adv_input').click(function() {
  var fileInput = $('#file_control_csv');
  fileInput = fileInput[0];
  var file = fileInput.files[0];
  var filereader = new FileReader();
  var content="";
  var has_headers=$('#has_headers').is(':checked')
 // filereader.onload = function(event) { create_table(event.currentTarget.result)}
 filereader.onload = function(event) { create_table(event.currentTarget.result,19,has_headers)}
  filereader.readAsText(file);
 // createModal(content);
})

var template_string='<div class="modal fade" id="modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">'
  +'<div class="modal-dialog  modal-lg" role="document">'
    +'<div class="modal-content">'
      +'<div class="modal-header">'
        +'<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>'
        +'<h4 class="modal-title" id="modalTitle">Modal title</h4>'
      +'</div>'
      +'<div class="modal-body"><div id ="container" >'
      +'<div id="modalContent" class= "table-responsive">'
      +'</div><button type="button" id="save" class="btn btn-primary btn-sm" style="margin-left:45%;margin-top:1%" >Save</button></button><button type="button" id="cancel" class="btn btn-primary btn-sm" style="margin-left:5%;margin-top:1%"">Cancel</button>'
      +'</div></div></div></div>';

var selector= '<select id="data_type" class="jpsurv-label-content" name="data_type">'
                      +'<option></option>'    
                      +'<option>Cohort</option>'    
                      +'<option>Year</option>'
                      +'<option>number.event</option>'
                      +'<option>number.alive</option>'
                      +'<option>number.loss</option>'
                      +'<option>expected.rate</option>'
                      +'<option>observedrelsurv</option>'

              +'</select>';


function createModal(content) {
  var header = "CSV File Form - Advance Settings";
  $('body').append($(template_string));
  $('#modalTitle').html(header);
  $('#modalContent').html(content);
  
  $('#cancel').click(function() {
      $('#modal').modal('hide');
  });

   $('#save').click(function() {
      $('#modal').modal('hide');
  });
  
  $('#modal').modal('show')

}

function create_table(content,max,has_headers){
  var arr=content.split("\n");
  var matrix=arr.map(function(line) { return line.split(',') })
  if(has_headers==true){
    var headers=matrix[0].map(function(header) {
      return {
        title: header
      }
    });
    matrix.shift();
  }
  else{
    counter=0;
    var headers=matrix[0].map(function(column) {
      counter++;
      return {
        title: "V"+counter
      }
    });
  }
  console.log(headers);
  console.log(matrix);

//  var table = $('<table id="example" class="table table-striped table-bordered" cellspacing="0" width="100%"></table>');
  var html=""
  var table = $('<table id="data_table" class="table table-striped table-bordered" style="border-top:none;border-left:none" cellspacing="0" width="100%"></table>')
  table.DataTable({
    columns: headers,
    data: matrix.slice(0,max),
    bSort: false,
    bFilter: false,
    paging: false,
    responsive: true,
    aaSorting: [],
    dom: 't'
  })

  var row = $('<tr>');
  counter=0

  for (var i = 0; i < headers.length; i ++) {
    var title = headers[0].title
    var selectHeader = $('<th id="type_'+i+'" style="border-style:none">')
    selectHeader.html(selector)
    row.append(selectHeader)
    console.log('added header', 0, title )
    console.log(row)
  }
  console.log(headers)
  html=table+'<button type="button" class="pull-right" id="Adv_input" >Advanced</button>'
  $(table[0].tHead).prepend(row);
  createModal(table);
}



