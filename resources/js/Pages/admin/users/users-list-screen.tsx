import Pagination from '@/Components/admin/Pagination';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import PrimaryButton from '@/Components/PrimaryButton';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import type { PaginatedData, User, PageProps } from '@/types';

interface UserListItem extends User {
    is_active: boolean;
}

interface UsersListPageProps extends PageProps {
    flash?: PageProps['flash'] & { temporaryPassword?: string };
}

const roleLabels: Record<string, string> = {
    tenant_admin: 'Admin',
    tenant_operator: 'Operator',
};

export default function UsersListScreen({ users }: { users: PaginatedData<UserListItem> }) {
    const { auth, flash } = usePage<UsersListPageProps>().props;
    const canManage = auth.user.role === 'tenant_admin';

    return (
        <AdminLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Users
                    </h2>
                    {canManage && (
                        <Link href={route('portal.users.create')}>
                            <PrimaryButton>Add User</PrimaryButton>
                        </Link>
                    )}
                </div>
            }
        >
            <Head title="Users" />

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                <SecretOnceCallout label="Temporary password" value={flash?.temporaryPassword} />

                <Table>
                    <Table.Head>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Role</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>
                            <span className="sr-only">Actions</span>
                        </Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {users.data.length === 0 && (
                            <Table.Empty colSpan={5}>No users yet.</Table.Empty>
                        )}

                        {users.data.map((user: UserListItem) => (
                            <tr key={user.id}>
                                <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                    {user.name}
                                    {user.id === auth.user.id && (
                                        <span className="ms-2 text-xs text-gray-400">(you)</span>
                                    )}
                                </Table.Td>
                                <Table.Td>{user.email}</Table.Td>
                                <Table.Td>{roleLabels[user.role] ?? user.role}</Table.Td>
                                <Table.Td>
                                    <StatusBadge color={user.is_active ? 'green' : 'gray'}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </StatusBadge>
                                </Table.Td>
                                <Table.Td className="text-right">
                                    {canManage && user.id !== auth.user.id && (
                                        <Link
                                            href={route(
                                                user.is_active
                                                    ? 'portal.users.deactivate'
                                                    : 'portal.users.reactivate',
                                                user.id,
                                            )}
                                            method="patch"
                                            as="button"
                                            className={
                                                user.is_active
                                                    ? 'font-medium text-red-600 hover:text-red-500 dark:text-red-400'
                                                    : 'font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400'
                                            }
                                        >
                                            {user.is_active ? 'Deactivate' : 'Reactivate'}
                                        </Link>
                                    )}
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={users.links} />
            </div>
        </AdminLayout>
    );
}
