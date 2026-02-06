// ─── UI Primitives ───
export { Button, buttonVariants, type ButtonProps } from './ui/button';
export { Badge, badgeVariants, StatusBadge, type SessionStatus } from './ui/badge';
export { Spinner, spinnerVariants } from './ui/spinner';
export { Separator } from './ui/separator';

// ─── Form Components ───
export { Input, type InputProps } from './ui/input';
export { Textarea, type TextareaProps } from './ui/textarea';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from './ui/select';

// ─── Overlay Components ───
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
export { ConfirmDialog, type ConfirmDialogProps } from './ui/confirm-dialog';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from './ui/dropdown-menu';
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './ui/tooltip';

// ─── Data Display ───
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './ui/card';
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  SortIcon,
  DataTable,
  type DataTableColumn,
  type DataTableProps,
  type SortIconProps,
} from './ui/table';
export { EmptyState, type EmptyStateProps } from './ui/empty-state';
export { Toaster, useToast, toast, toastVariants, type Toast, type ToastVariant } from './ui/toast';

// ─── Layout ───
export { NavBar, type NavBarProps, type NavTab } from './layout/navbar';
export { Footer, type FooterProps } from './layout/footer';
