import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import {MatPaginator, MatTableDataSource} from '@angular/material';
import { TdFileService, IUploadOptions } from '@covalent/core/file';
import { environment } from '../../environments/environment';

@Component({
  selector: 'rrt-group',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss']
})
export class GroupComponent implements OnInit {

  dataSource = new MatTableDataSource<any>([{
   link: 0.67,
   cure: 0.67,
   lambda: 0.67,
   theta:0.67,
   surv_curemodel:0.67,
   surv_notcure:0.45,
   median_surv_notcured:0.67,
   s1_numerical:0.67,
   G_numerical:0.67,
   CI_numerical:0.67,
   s1_analytical:0.67,
   G_analytical:0.67,
   CI_analytical:0.67,
   se_CI_analytical:0.67,
   obs_surv:0.67,
   obs_dist_surv:0.67

  }]);

  displayedColumns: string[] = [
    'link',
    'cure',
    'lambda',
    'theta',
    'surv_curemodel',
    'surv_notcure',
    'median_surv_notcured',
    's1_numerical',
    'G_numerical',
    'CI_numerical',
    's1_analytical',
    'G_analytical',
    'CI_analytical',
    'se_CI_analytical',
    'obs_surv',
    'obs_dist_surv'];

  columnsToDisplay: string[] = this.displayedColumns.slice();
  groupDataForm: FormGroup;

  stageVariables: string[] = ['test1','test2'];
  distantStageValues: string[] = ['test3','test4'];

  followup: any = {
    max: 30,
    min: 1,
    step: 1,
    interval: 1
  };

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private fileUploadService: TdFileService,private formBuilder: FormBuilder) {
    this.groupDataForm = formBuilder.group({
      seerDictionaryFile: new FormControl(''),
      seerDataFile: new FormControl(''),
      canSurvDataFile: new FormControl(''),
      stageVariable: new FormControl(''),
      stageValue: new FormControl(''),
      adjustmentFactor: new FormControl('1'),
      yearsOfFollowUp: new FormControl('25')
    });

    this.groupDataForm.get('seerDictionaryFile').valueChanges.subscribe( file => {
       this.handleSeerDictionaryFileChange(file);
    });

    this.groupDataForm.get('seerDataFile').valueChanges.subscribe( file => {
       this.handleSeerDataFileChange(file);
    });

  }

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
  }

  onSubmit() {
    //submit everything
    console.log(this.groupDataForm);
    if(this.groupDataForm.invalid) {
      console.log("Form is invalid")
      return;
    }

    console.log("Form submitted");
    console.log(this.groupDataForm);
  }

  handleSeerDictionaryFileChange(file: File) {
    if(file) {
      console.log("Dictionary changed");
      console.log(file);
    }
  }

  handleSeerDataFileChange(file: File) {
    if(file) {
      console.log("Data file changed");
      console.log(file);
    }
  }

  loadSeerFormData() {
     //upload files and get back metadata to fill in forms
     //also update form controls with new data
     //let options: IUploadOptions = {
     //      url: 'https://url.to/API',
     //      method: 'post',
     //      file: file
     //    };
     //    this.fileService.upload(options).subscribe((response) => {
     //      ...
     //    });
  }

}
