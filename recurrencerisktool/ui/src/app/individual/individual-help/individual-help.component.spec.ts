import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IndividualHelpComponent } from './individual-help.component';

describe('HelpComponent', () => {
  let component: IndividualHelpComponent;
  let fixture: ComponentFixture<IndividualHelpComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IndividualHelpComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IndividualHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
