"use client";

import { TeamTab } from "@/app/(dashboard)/settings/TeamTab";

export default function TeamPage() {
    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Team</h1>
                    <p className="ac-page-sub">Manage team members, pending invitations, and activity logs.</p>
                </div>
            </div>
            <TeamTab />
        </>
    );
}
