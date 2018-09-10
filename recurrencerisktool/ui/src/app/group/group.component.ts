import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'rrt-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss']
})
export class GroupComponent implements OnInit {

  private groupDataForm: FormGroup;

  private stageVariables: string[] = [];
  private distantStageValues: string[] = [];

  private followup: any = {
    max: 30,
    min: 1,
    step: 1,
    interval: 1
  };

  constructor(private formBuilder: FormBuilder) {
    this.groupDataForm = formBuilder.group({
      seerDictionaryFile: new FormControl(''),
      seerDataFile: new FormControl(''),
      canSurvDataFile: new FormControl(''),
      stageVariable: new FormControl(''),
      stageValue: new FormControl(''),
      adjustmentFactor: new FormControl(''),
      yearsOfFollowUp: new FormControl('25')
    });
  }

  ngOnInit() {
  }

  onSubmit() {
    console.log(this.groupDataForm);
    if(this.groupDataForm.invalid) {
      console.log("Form is invalid")
      return;
    }

    console.log("Form submitted");
    console.log(this.groupDataForm);
  }

}
