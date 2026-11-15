'use client';

import { Printer } from 'lucide-react';
import Button from './Button';

export default function PrintButton() {
  return (
    <Button variant="ghost" size="sm" className="no-print" icon={<Printer className="h-4 w-4" aria-hidden="true" />} onClick={() => window.print()}>
      Print
    </Button>
  );
}
