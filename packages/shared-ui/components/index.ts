// ─── UI Primitives ───
export { Button, buttonVariants, type ButtonProps } from './ui/button';
export { Badge, badgeVariants, StatusBadge, type SessionStatus } from './ui/badge';
export { Spinner, spinnerVariants } from './ui/spinner';
export { Separator } from './ui/separator';

// ─── Form Components ───
export { Input, type InputProps } from './ui/input';
export { Textarea, type TextareaProps } from './ui/textarea';
export { SearchInput, type SearchInputProps } from './ui/search-input';
export { Checkbox, type CheckboxProps } from './ui/checkbox';
export { Label, labelVariants, type LabelProps } from './ui/label';
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

// ─── Feedback ───
export { Alert, alertVariants, type AlertProps } from './ui/alert';
export { Toaster, useToast, toast, toastVariants, type Toast, type ToastVariant } from './ui/toast';

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
export { StatCard, type StatCardProps } from './ui/stat-card';
export { EmptyState, type EmptyStateProps } from './ui/empty-state';
export { ToggleGroup, type ToggleGroupProps, type ToggleGroupItem } from './ui/toggle-group';
export { LoadingScreen, type LoadingScreenProps } from './ui/loading-screen';

// ─── Layout ───
export { NavBar, type NavBarProps, type NavTab } from './layout/navbar';
export { Footer, type FooterProps } from './layout/footer';
export { PageContainer } from './layout/page-container';
export { LoginScreen, type LoginScreenProps } from './layout/login-screen';
