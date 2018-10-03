import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatPaginator, MatTableDataSource, MatSort} from '@angular/material';

import { TdFileService, IUploadOptions } from '@covalent/core/file';
import { environment } from '../../environments/environment';
import { RecurrenceRiskService } from '../../shared/services/recurrenceRisk.service';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'rrt-individual',
  templateUrl: './individual.component.html',
  styleUrls: ['./individual.component.scss']
})
export class IndividualComponent implements OnInit {

  dataSource = new MatTableDataSource<any>([{},{},{}]);

  displayedColumns: string[] = [
    'link',
    'cure',
    'lambda',
    'theta',
    'surv_curemodel',
    'surv_notcured',
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

  individualDataForm: FormGroup;

  distributionList: string[] = ['Log-logistic','Weibull'];

  individualMetadata: any = { variables: ['test1','test2','test3']};

  isDataLoading: boolean = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;

  @ViewChild(MatSort) sort: MatSort;

  errorMsg: string = "";

  followup: any = {
      max: 30,
      min: 1,
      step: 1,
      interval: 1
    };

  constructor(private fileUploadService: TdFileService,private formBuilder: FormBuilder,
    private riskService: RecurrenceRiskService,private router: Router) {
    this.individualDataForm = formBuilder.group({
          seerDataFile: [''],
          strata: [''],
          covariates: [''],
          timeVariable: [''],
          eventVariable: [''],
          distribution: [''],
          stageVariable: [''],
          distantStageValue: [''],
          adjustmentFactor: [''],
          yearsOfFollowUp: ['2']
        });
  }

  ngOnInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    let state = this.riskService.getCurrentState('individual');
    this.dataSource.data = state.data;
    this.individualMetadata = state.metadata;
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  isNumber(value:any) {
    return !isNaN(value);
  }

  unboxNumber(value:any) {
    if( Array.isArray(value) ) {
      return (value.length > 0) ? value[0] : 'NA';
    } else {
      return value;
    }
  }

  valuesForVariable() : any[] {
    let variable = this.individualDataForm.get('stageVariable').value;
  	let values = this.individualMetadata['values'];
  	if(values) {
  		return values[variable];
  	} else {
  		return [];
  	}
  }

  getErrorMessage(): String {
    return this.errorMsg;
  }
}
