'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export type DeleteCellOption = 'shift-left' | 'shift-up' | 'delete-row' | 'delete-column';

interface DeleteCellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (option: DeleteCellOption) => void;
}

export const DeleteCellDialog: React.FC<DeleteCellDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [selectedOption, setSelectedOption] = useState<DeleteCellOption>('shift-left');

  const handleConfirm = () => {
    onConfirm(selectedOption);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>删除单元格</AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="py-4">
          <RadioGroup 
            value={selectedOption} 
            onValueChange={(value) => setSelectedOption(value as DeleteCellOption)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shift-left" id="shift-left" />
              <Label htmlFor="shift-left" className="cursor-pointer">右侧单元格左移(L)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shift-up" id="shift-up" />
              <Label htmlFor="shift-up" className="cursor-pointer">下方单元格上移(U)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="delete-row" id="delete-row" />
              <Label htmlFor="delete-row" className="cursor-pointer">删除整行(R)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="delete-column" id="delete-column" />
              <Label htmlFor="delete-column" className="cursor-pointer">删除整列(C)</Label>
            </div>
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-purple-600 hover:bg-purple-700">
            确定
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
