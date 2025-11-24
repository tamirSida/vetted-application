import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { EquityBreakdownRow } from '../../../models';

@Component({
  selector: 'app-equity-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="equity-table-container">
      <div class="table-wrapper">
        <table class="equity-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Initial Shares</th>
              <th>Fully Diluted Ownership %</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Founders Section -->
            <tr class="section-header">
              <td colspan="4" class="section-title">Initial Shareholders <span class="required-asterisk">*</span></td>
            </tr>
            <tr *ngFor="let row of getRowsByCategory('founder'); let i = index" [formGroup]="getFormGroup(row.id)">
              <td>
                <input 
                  type="text" 
                  formControlName="name"
                  class="table-input"
                  [placeholder]="'Shareholder ' + (i + 1)"
                  (blur)="updateRow(row.id)"
                >
              </td>
              <td>
                <input 
                  type="text" 
                  formControlName="shares"
                  class="table-input number-input"
                  [value]="formatNumber(row.shares)"
                  (input)="onSharesInput($event, row.id)"
                  (blur)="onSharesBlur($event, row.id)"
                >
              </td>
              <td>
                <span class="percentage-display">{{ row.percentage.toFixed(2) }}%</span>
              </td>
              <td>
                <button 
                  type="button" 
                  class="btn-remove"
                  (click)="removeRow(row.id)"
                  [disabled]="getRowsByCategory('founder').length <= 1"
                  title="Remove founder"
                >
                  ×
                </button>
              </td>
            </tr>
            <tr class="total-row">
              <td class="total-label">Total</td>
              <td class="total-value">{{ getTotalSharesByCategory('founder').toLocaleString() }}</td>
              <td class="total-value">{{ getTotalPercentageByCategory('founder').toFixed(2) }}%</td>
              <td>
                <button type="button" class="btn-add" (click)="addFounderRow()">
                  + Add Founder
                </button>
              </td>
            </tr>
            
            <!-- Spacer -->
            <tr class="spacer-row">
              <td colspan="4"></td>
            </tr>

            <!-- Employee Options Pool -->
            <tr class="section-header">
              <td colspan="4" class="section-title">Employee Options Pool <span class="optional-label">(Optional)</span></td>
            </tr>
            <tr *ngFor="let row of getRowsByCategory('employee')" [formGroup]="getFormGroup(row.id)">
              <td>
                <input 
                  type="text" 
                  formControlName="name"
                  class="table-input"
                  placeholder="Employee Options Pool"
                  (blur)="updateRow(row.id)"
                >
              </td>
              <td>
                <input 
                  type="text" 
                  formControlName="shares"
                  class="table-input number-input"
                  [value]="formatNumber(row.shares)"
                  (input)="onSharesInput($event, row.id)"
                  (blur)="onSharesBlur($event, row.id)"
                >
              </td>
              <td>
                <span class="percentage-display">{{ row.percentage.toFixed(2) }}%</span>
              </td>
              <td>
                <button 
                  type="button" 
                  class="btn-remove"
                  (click)="removeRow(row.id)"
                  title="Remove employee pool"
                >
                  ×
                </button>
              </td>
            </tr>
            <tr *ngIf="getRowsByCategory('employee').length === 0" class="add-row">
              <td colspan="3"></td>
              <td>
                <button type="button" class="btn-add" (click)="addEmployeeRow()">
                  + Add Employee Pool
                </button>
              </td>
            </tr>
            
            <!-- Spacer -->
            <tr class="spacer-row">
              <td colspan="4"></td>
            </tr>

            <!-- Investors Section -->
            <tr class="section-header">
              <td colspan="4" class="section-title">Investors <span class="optional-label">(Optional)</span></td>
            </tr>
            <tr *ngFor="let row of getRowsByCategory('investor'); let i = index" [formGroup]="getFormGroup(row.id)">
              <td>
                <input 
                  type="text" 
                  formControlName="name"
                  class="table-input"
                  [placeholder]="getInvestorPlaceholder(i)"
                  (blur)="updateRow(row.id)"
                >
              </td>
              <td>
                <input 
                  type="text" 
                  formControlName="shares"
                  class="table-input number-input"
                  [value]="formatNumber(row.shares)"
                  (input)="onSharesInput($event, row.id)"
                  (blur)="onSharesBlur($event, row.id)"
                >
              </td>
              <td>
                <span class="percentage-display">{{ row.percentage.toFixed(2) }}%</span>
              </td>
              <td>
                <button 
                  type="button" 
                  class="btn-remove"
                  (click)="removeRow(row.id)"
                  title="Remove investor"
                >
                  ×
                </button>
              </td>
            </tr>
            <tr class="total-row">
              <td class="total-label">Total</td>
              <td class="total-value">{{ getTotalSharesByCategory('investor').toLocaleString() }}</td>
              <td class="total-value">{{ getTotalPercentageByCategory('investor').toFixed(2) }}%</td>
              <td>
                <button type="button" class="btn-add" (click)="addInvestorRow()">
                  + Add Investor
                </button>
              </td>
            </tr>
            
            <!-- Spacer -->
            <tr class="spacer-row">
              <td colspan="4"></td>
            </tr>

            <!-- Grand Total -->
            <tr class="grand-total-row">
              <td class="grand-total-label">Grand Total</td>
              <td class="grand-total-value">{{ getTotalShares().toLocaleString() }}</td>
              <td class="grand-total-value">{{ getTotalPercentage().toFixed(2) }}%</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Validation Messages -->
      <div *ngIf="!isPercentageValid()" class="validation-warning">
        <i class="warning-icon">⚠️</i>
        Total ownership percentage is {{ getTotalPercentage().toFixed(2) }}%. It should equal 100%.
      </div>

      <div *ngIf="getFoundersWithShares() === 0" class="validation-warning">
        <i class="warning-icon">⚠️</i>
        You must have at least one initial shareholder with shares greater than 0.
      </div>

      <!-- SAFE/Convertible Note Warning -->
      <div class="safe-note-warning">
        <i class="info-icon">ℹ️</i>
        <strong>Important:</strong> If you raised money via a SAFE or other convertible note, make sure it is noted in the funding history question above and DO NOT add it to this CAP table.
      </div>
    </div>
  `,
  styles: [`
    .equity-table-container {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      background: white;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .equity-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    .equity-table th {
      background: #f9fafb;
      padding: 1rem 0.75rem;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }

    .equity-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: middle;
    }

    .section-header {
      background: #f8fafc;
    }

    .section-title {
      font-weight: 600;
      color: #4b5563;
      padding: 0.75rem !important;
      background: #f8fafc;
    }

    .required-asterisk {
      color: #ef4444;
      font-weight: 700;
      margin-left: 0.25rem;
    }

    .optional-label {
      color: #6b7280;
      font-weight: 400;
      font-size: 0.85em;
      margin-left: 0.5rem;
    }

    .table-input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 0.9rem;
      background: white;
      transition: border-color 0.3s;
    }

    .table-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
    }

    .number-input {
      text-align: right;
      font-family: 'Monaco', 'Menlo', monospace;
    }

    .percentage-display {
      font-family: 'Monaco', 'Menlo', monospace;
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }

    .total-row {
      background: #f9fafb;
      font-weight: 600;
    }

    .total-label,
    .total-value {
      color: #374151;
      font-weight: 600;
    }

    .grand-total-row {
      background: #667eea;
      color: white;
      font-weight: 700;
    }

    .grand-total-label,
    .grand-total-value {
      color: white;
      font-weight: 700;
    }

    .spacer-row td {
      padding: 0.25rem;
      border: none;
      background: #fefefe;
    }

    .add-row {
      background: #fafafa;
    }

    .btn-add {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.4rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .btn-add:hover {
      background: #059669;
    }

    .btn-remove {
      background: #ef4444;
      color: white;
      border: none;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-remove:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn-remove:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .validation-warning {
      padding: 1rem;
      background: #fef3c7;
      border-top: 1px solid #f59e0b;
      color: #92400e;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .warning-icon {
      font-size: 1rem;
    }

    .safe-note-warning {
      padding: 1rem;
      background: #eff6ff;
      border-top: 1px solid #3b82f6;
      color: #1e40af;
      font-size: 0.9rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      line-height: 1.5;
    }

    .info-icon {
      font-size: 1rem;
      margin-top: 0.1rem;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .equity-table {
        font-size: 0.8rem;
      }
      
      .equity-table th,
      .equity-table td {
        padding: 0.5rem 0.25rem;
      }
      
      .table-input {
        padding: 0.25rem;
        font-size: 0.8rem;
      }
      
      .btn-add {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
      }
    }
  `]
})
export class EquityTableComponent implements OnInit {
  @Input() equityRows: EquityBreakdownRow[] = [];
  @Output() rowsChanged = new EventEmitter<EquityBreakdownRow[]>();

  private fb = inject(FormBuilder);
  
  formGroups: { [key: string]: FormGroup } = {};

  ngOnInit() {
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.initializeDefaultRows();
      this.setupFormGroups();
      this.recalculatePercentages();
    });
  }

  private initializeDefaultRows() {
    if (this.equityRows.length === 0) {
      this.equityRows = [
        {
          id: 'founder-1',
          name: 'Shareholder 1',
          shares: 500000,
          percentage: 0,
          category: 'founder'
        },
        {
          id: 'founder-2',
          name: 'Shareholder 2',
          shares: 500000,
          percentage: 0,
          category: 'founder'
        }
        // Note: Employee Options Pool is now optional and not initialized by default
      ];
    }
  }

  private setupFormGroups() {
    this.equityRows.forEach(row => {
      if (!this.formGroups[row.id]) {
        this.formGroups[row.id] = this.fb.group({
          name: [row.name, Validators.required],
          shares: [row.shares, [Validators.required, Validators.min(0)]]
        });
      }
    });
  }

  getFormGroup(rowId: string): FormGroup {
    if (!this.formGroups[rowId]) {
      const row = this.equityRows.find(r => r.id === rowId);
      this.formGroups[rowId] = this.fb.group({
        name: [row?.name || '', Validators.required],
        shares: [row?.shares || 0, [Validators.required, Validators.min(0)]]
      });
    }
    return this.formGroups[rowId];
  }

  getRowsByCategory(category: string): EquityBreakdownRow[] {
    return this.equityRows.filter(row => row.category === category);
  }

  getTotalSharesByCategory(category: string): number {
    return this.getRowsByCategory(category)
      .reduce((sum, row) => sum + (row.shares || 0), 0);
  }

  getTotalPercentageByCategory(category: string): number {
    return this.getRowsByCategory(category)
      .reduce((sum, row) => sum + (row.percentage || 0), 0);
  }

  getTotalShares(): number {
    return this.equityRows.reduce((sum, row) => sum + (row.shares || 0), 0);
  }

  getTotalPercentage(): number {
    return this.equityRows.reduce((sum, row) => sum + (row.percentage || 0), 0);
  }

  getFoundersWithShares(): number {
    return this.getRowsByCategory('founder').filter(row => (row.shares || 0) > 0).length;
  }

  isPercentageValid(): boolean {
    const totalPercentage = this.getTotalPercentage();
    // Use a tolerance of 0.01% to account for floating-point precision errors
    return Math.abs(totalPercentage - 100) < 0.01;
  }

  recalculatePercentages() {
    const totalShares = this.getTotalShares();
    
    if (totalShares > 0) {
      this.equityRows.forEach(row => {
        row.percentage = (row.shares / totalShares) * 100;
      });
    } else {
      this.equityRows.forEach(row => {
        row.percentage = 0;
      });
    }

    this.emitChanges();
  }

  updateRow(rowId: string) {
    const formGroup = this.formGroups[rowId];
    const row = this.equityRows.find(r => r.id === rowId);
    
    if (formGroup && row) {
      row.name = formGroup.get('name')?.value || '';
      row.shares = parseInt(formGroup.get('shares')?.value || '0');
      this.recalculatePercentages();
    }
  }

  addFounderRow() {
    const founderCount = this.getRowsByCategory('founder').length;
    const newRow: EquityBreakdownRow = {
      id: `founder-${Date.now()}`,
      name: `Shareholder ${founderCount + 1}`,
      shares: 0,
      percentage: 0,
      category: 'founder'
    };

    this.equityRows.splice(this.findInsertIndex('founder'), 0, newRow);
    this.setupFormGroups();
    this.recalculatePercentages();
  }

  addEmployeeRow() {
    const employeeCount = this.getRowsByCategory('employee').length;
    const newRow: EquityBreakdownRow = {
      id: `employee-${Date.now()}`,
      name: employeeCount === 0 ? 'Employee Options Pool' : `Employee Pool ${employeeCount + 1}`,
      shares: 0,
      percentage: 0,
      category: 'employee'
    };

    this.equityRows.splice(this.findInsertIndex('employee'), 0, newRow);
    this.setupFormGroups();
    this.recalculatePercentages();
  }

  addInvestorRow() {
    const investorCount = this.getRowsByCategory('investor').length;
    const newRow: EquityBreakdownRow = {
      id: `investor-${Date.now()}`,
      name: this.getInvestorPlaceholder(investorCount),
      shares: 0,
      percentage: 0,
      category: 'investor'
    };

    this.equityRows.splice(this.findInsertIndex('investor'), 0, newRow);
    this.setupFormGroups();
    this.recalculatePercentages();
  }

  removeRow(rowId: string) {
    const index = this.equityRows.findIndex(row => row.id === rowId);
    if (index !== -1) {
      this.equityRows.splice(index, 1);
      delete this.formGroups[rowId];
      this.recalculatePercentages();
    }
  }

  getInvestorPlaceholder(index: number): string {
    const investorTypes = ['Seed Investor', 'Series A Investor', 'Series B Investor', 'Angel Investor'];
    return investorTypes[index] || `Investor ${index + 1}`;
  }

  private findInsertIndex(category: string): number {
    const categoryRows = this.getRowsByCategory(category);
    if (categoryRows.length === 0) {
      // Find where to insert the first row of this category
      const lastFounderIndex = this.findLastIndexOfCategory('founder');
      const lastEmployeeIndex = this.findLastIndexOfCategory('employee');
      
      if (category === 'employee') {
        return lastFounderIndex + 1;
      } else if (category === 'investor') {
        return lastEmployeeIndex !== -1 ? lastEmployeeIndex + 1 : lastFounderIndex + 1;
      }
      return this.equityRows.length;
    } else {
      // Insert after the last row of this category
      const lastRowIndex = this.findLastIndexOfCategory(category);
      return lastRowIndex + 1;
    }
  }

  private findLastIndexOfCategory(category: string): number {
    for (let i = this.equityRows.length - 1; i >= 0; i--) {
      if (this.equityRows[i].category === category) {
        return i;
      }
    }
    return -1;
  }

  private emitChanges() {
    this.rowsChanged.emit([...this.equityRows]);
  }

  // Format number with commas for display
  formatNumber(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Parse formatted number string to number
  parseNumber(value: string): number {
    return parseInt(value.replace(/,/g, ''), 10) || 0;
  }

  // Handle number input formatting
  onSharesInput(event: any, rowId: string) {
    const input = event.target;
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    
    // Remove non-numeric characters except commas
    let value = oldValue.replace(/[^\d]/g, '');
    
    // Add commas for thousands
    if (value) {
      value = parseInt(value, 10).toLocaleString();
    }
    
    // Update the form control with the numeric value
    const formGroup = this.getFormGroup(rowId);
    if (formGroup) {
      const numericValue = this.parseNumber(value);
      formGroup.get('shares')?.setValue(numericValue, { emitEvent: false });
    }
    
    // Update the display value
    input.value = value;
    
    // Restore cursor position
    const newLength = value.length;
    const oldLength = oldValue.length;
    const newPosition = cursorPosition + (newLength - oldLength);
    input.setSelectionRange(newPosition, newPosition);
    
    this.recalculatePercentages();
  }

  // Handle blur to ensure proper formatting
  onSharesBlur(event: any, rowId: string) {
    const input = event.target;
    const value = this.parseNumber(input.value);
    
    // Format and display the number
    input.value = value ? this.formatNumber(value) : '';
    
    this.updateRow(rowId);
  }
}