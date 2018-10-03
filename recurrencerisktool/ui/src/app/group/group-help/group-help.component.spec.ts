import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupHelpComponent } from './group-help.component';

describe('HelpComponent', () => {
  let component: GroupHelpComponent;
  let fixture: ComponentFixture<GroupHelpComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupHelpComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
