export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
  children: CategoryTreeNode[];
}
