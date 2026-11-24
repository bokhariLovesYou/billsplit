import * as Dialog from '@radix-ui/react-dialog';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../lib/utils.js';
import { X } from 'lucide-react';

const button = cva('inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4', {
  variants: { variant: { default: 'bg-primary text-primary-foreground hover:bg-primary/90', outline: 'border border-border bg-card hover:bg-muted', ghost: 'hover:bg-muted text-foreground', icon: 'w-10 px-0 hover:bg-muted text-muted-foreground' } },
  defaultVariants: { variant: 'default' },
});

export function Button({ variant, className, asChild, ...props }) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(button({ variant }), className)} {...props} />;
}
export function Card({ className, ...props }) {
  return <div className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-xs', className)} {...props} />;
}
export function Input({ className, ...props }) {
  return <input className={cn('h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20', className)} {...props} />;
}
export function Badge({ pending, children }) {
  return <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', pending ? 'bg-amber-100 text-amber-900' : 'bg-muted text-foreground')}><span className="size-1.5 rounded-full bg-current" />{children}</span>;
}
export function Modal({ title, description, close, children }) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open) close(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/45" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl border border-border bg-card p-6 shadow-xl outline-none">
        <Dialog.Title className="pr-8 text-xl font-semibold tracking-tight">{title}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
        <Dialog.Close asChild><Button type="button" variant="icon" className="absolute top-4 right-4" aria-label="Close"><X /></Button></Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
