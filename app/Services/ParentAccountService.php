<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\ParentAccount;
use App\Models\Person;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ParentAccountService
{
    /** @param array{name: string, email: string, password?: ?string, student_ids: array<string>} $data */
    public function save(User $actor, array $data, ?ParentAccount $parent = null): ParentAccount
    {
        Gate::forUser($actor)->authorize($parent ? 'update' : 'create', $parent ?? ParentAccount::class);

        return DB::connection('mysql')->transaction(function () use ($actor, $data, $parent) {
            $studentIds = array_values(array_unique($data['student_ids']));
            $validCount = Person::query()->where('tenant_id', $actor->tenant_id)
                ->where('person_type', 'student')->whereIn('id', $studentIds)->count();
            if ($validCount !== count($studentIds)) {
                throw ValidationException::withMessages(['student_ids' => 'Only students registered in your school can be linked.']);
            }
            $creating = $parent === null;
            $parent = $creating ? new ParentAccount : ParentAccount::query()->lockForUpdate()->findOrFail($parent->id);
            $before = $creating ? [] : $parent->studentLinks()->pluck('person_id')->all();
            $parent->fill(['name' => $data['name'], 'email' => $data['email']]);
            if ($creating) {
                $parent->tenant_id = $actor->tenant_id;
                $parent->is_active = true;
                $parent->login_id = ParentAccount::generateLoginId($actor->tenant_id);
            }
            if (! empty($data['password'])) {
                $parent->password = $data['password'];
            }
            $parent->save();

            $parent->studentLinks()->whereNotIn('person_id', $data['student_ids'])->delete();
            foreach (array_diff($data['student_ids'], $before) as $studentId) {
                $parent->studentLinks()->create(['person_id' => $studentId, 'approved_by' => $actor->id]);
            }

            AuditLog::record($creating ? 'parent.created' : 'parent.updated', $actor, $actor->tenant_id, 'parent_account', $parent->id, [
                'linked_student_ids' => array_values(array_diff($data['student_ids'], $before)),
                'unlinked_student_ids' => array_values(array_diff($before, $data['student_ids'])),
                'password_changed' => ! empty($data['password']),
            ]);

            return $parent;
        });
    }

    public function setActive(User $actor, ParentAccount $parent, bool $active): void
    {
        Gate::forUser($actor)->authorize('update', $parent);
        DB::connection('mysql')->transaction(function () use ($actor, $parent, $active) {
            $parent = ParentAccount::query()->lockForUpdate()->findOrFail($parent->id);
            $parent->is_active = $active;
            $parent->save();
            AuditLog::record($active ? 'parent.reactivated' : 'parent.deactivated', $actor, $actor->tenant_id, 'parent_account', $parent->id);
        });
    }
}
