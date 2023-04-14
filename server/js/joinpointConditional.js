// define controls and actions
const formContainer = $('#conditionalIntervalContainer');
const addForm = $('#addConditionalInterval').click(addCondIntForm);
const conditionalRecalculateButton = $('#recalculateConditional').click(
  recalculateConditional
);

// toggle and update select forms options
$('#useConditionalJp').change((e) => {
  const checked = e.currentTarget.checked;
  const allFormSelects = $(
    '.conditionalIntervalStart, .conditionalIntervalEnd'
  );
  const recalculate = $('#recalculateConditional').prop('disabled', !checked);
  allFormSelects.each((i, e) => $(e).prop('disabled', !checked));

  if (checked) populateCondIntOptions();
});

function getIntervalOptions() {
  if (control_data.input_type == 'csv') {
    return control_data?.data[control_data.interval[1]];
  } else {
    return control_data?.VarFormatSecList.Interval.ItemNameInDic;
  }
}

function populateCondIntOptions() {
  const intervals = getIntervalOptions();
  const allFormSelects = $(
    '.conditionalIntervalStart, .conditionalIntervalEnd'
  );
  // add options
  allFormSelects.each((_, e) => {
    if ($(e).find('option').length == 0) {
      intervals.forEach((i) =>
        $(e).append(`<option value="${i}">${i}</option>`)
      );
    }
  });
}

function addCondIntForm() {
  const disabled = !$('#useConditionalJp').is(':checked');
  const allForms = $('.conditionalIntervalForm');
  const index = allForms.length;
  const form = $(
    $.parseHTML(
      `
      <div 
        id="conditionalIntervalForm-${index}" 
        class="conditionalIntervalForm d-flex"
      >
        <div class="d-block">
          <div class="form-group mb-0 mr-3">
            <label
              class="font-weight-bold"
              for="intervalStart${index}"
            >Start Interval:</label
            >       
            <select
              id="intervalStart${index}"
              name="intervalStart${index}"
              class="conditionalIntervalStart mx-3"
              aria-label="start"
              ${disabled ? 'disabled' : ''}
              required
            ></select>
            </div>
            <label
              id="intervalStart${index}-error"
              for="intervalStart${index}"
              class="text-danger error"
            >
            </label>
          </div>
          <div class="form-group mb-0">
            <label
              class="font-weight-bold"
              for="endStart${index}"
              >End Interval:</label
            >
            <select
              id="intervalEnd${index}"
              name="intervalEnd${index}"
              class="conditionalIntervalEnd mx-3"
              aria-label="end"
              ${disabled ? 'disabled' : ''}
              required
            ></select>
          </div>
          <button 
            type="button" 
            class="btn btn-link mb-4" 
            onClick="removeCondIntForm(${index})">
            - Remove Interval
          </button>
          <div class="invalid-feedback">
            Start interval must be less than the end interval.
          </div>
        </div>
      </div>
      `
    )
  );

  formContainer.append(form);
  $('select').select2({
    dropdownAutoWidth: true,
    width: 'auto',
  });
  populateCondIntOptions();
}

function removeCondIntForm(index) {
  $(`#conditionalIntervalForm-${index}`).remove();
}

// validate and submit form
function recalculateConditional() {
  const form = $('#conditionalJoinpointForm');
  let rules = {};
  let messages = {};

  // dynamically add form rules
  form.find('select').each((i, e) => {
    const name = $(e).attr('name');
    const formIndex = name.slice(-1);
    if (name.includes('Start')) {
      rules[name] = { lessThan: `#intervalEnd${formIndex}` };
      messages[name] = { lessThan: `Start must be less than End` };
    }
  });

  form
    .submit((e) => e.preventDefault())
    .validate({
      rules,
      messages,
      submitHandler: async (form) => {
        console.log('success');
      },
    });
}

// custom validation rules
$.validator.addMethod('lessThan', (value, element, param) => {
  const $otherElement = $(param);
  return parseInt(value) < parseInt($otherElement.val());
});
