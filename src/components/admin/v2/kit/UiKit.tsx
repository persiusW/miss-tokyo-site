"use client";

// Every shared admin v2 component in one place, with its states. Admin only,
// not in the nav. Used to check the kit in both themes and on touch.
import { useState } from "react";
import {
    Badge, Banner, Btn, BulkBar, Card, Chip, ConfirmPanel, Empty, ErrorState, Field, FulBadge, IconBtn, Kpi, LineChart,
    Menu, Modal, Money, PageHeader, Panel, PayBadge, Percent, Qty, RadioCards, Search, Seg, Select, SkeletonRows, SRow,
    Switch, Tabs, TagEditor, TwoTap, UnsavedBar, toast,
} from "@/components/admin/ui";

export function UiKit() {
    const [sw, setSw] = useState(true);
    const [seg, setSeg] = useState<"today" | "7d" | "30d">("today");
    const [chip, setChip] = useState("all");
    const [rc, setRc] = useState<"cash" | "link" | "gift">("cash");
    const [sel, setSel] = useState("a");
    const [money, setMoney] = useState("50");
    const [pct, setPct] = useState("2.5");
    const [q, setQ] = useState("");
    const [tab, setTab] = useState<"one" | "two">("one");
    const [tags, setTags] = useState(["VIP"]);
    const [qty, setQty] = useState(1);
    const [panel, setPanel] = useState(false);
    const [panel2, setPanel2] = useState(false);
    const [modal, setModal] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [bulk, setBulk] = useState(2);
    const [dirty, setDirty] = useState(2);

    return (
        <>
            <PageHeader title="Component kit" sub="Every shared component and its states. Owners and staff never see this page." crumb="Settings" crumbHref="/settings"
                actions={<><Btn kind="ghost" icon="download">Ghost</Btn><Btn kind="primary" icon="plus">Primary</Btn></>} />
            <Tabs label="Kit sections" value={tab} onChange={setTab} tabs={[{ v: "one", l: "Controls" }, { v: "two", l: "Feedback", c: 3, dot: true }]} />
            <div className="grid-4">
                <Kpi label="Sales" value="GH₵ 3,860" delta={24} ctx="vs same time yesterday" />
                <Kpi label="Orders" value="6" delta={-3} ctx="vs same time yesterday" />
                <Kpi label="Average order" value="GH₵ 643" ctx="paid orders only" />
                <Kpi label="Cash to count at close" value="GH₵ 630" ctx="from 1 POS sale" />
            </div>
            <Card title="Buttons" pad>
                <div className="hrow wrap">
                    <Btn kind="primary">Primary</Btn><Btn>Secondary</Btn><Btn kind="ghost">Ghost</Btn><Btn kind="danger">Danger</Btn>
                    <Btn kind="danger-solid">Danger solid</Btn><Btn disabled>Disabled</Btn><Btn sm>Compact</Btn>
                    <TwoTap label="Delete" onConfirm={() => toast.success("Deleted", { action: { label: "Undo", onClick: () => toast.info("Undone") } })} />
                    <IconBtn label="Close" icon="x" /><IconBtn label="Alerts" icon="bell" pip />
                    <Menu items={[{ l: "Resend confirmation", icon: "mail", onClick: () => toast.success("Sent") }, "-", { l: "Delete", icon: "trash", danger: true, onClick: () => toast.error("Deleted") }]} />
                </div>
            </Card>
            <div className="grid-2">
                <Card title="Inputs" pad>
                    <div className="stack">
                        <Field label="Search"><Search value={q} onChange={setQ} placeholder="Search by order number, name or phone" /></Field>
                        <Field label="Delivery in Accra" help="Takes effect on the next order." htmlFor="m"><Money id="m" value={money} onChange={setMoney} /></Field>
                        <Field label="Processing fee" htmlFor="p"><Percent id="p" value={pct} onChange={setPct} /></Field>
                        <Field label="Reason" error="Choose a reason." htmlFor="s"><Select id="s" value={sel} onChange={setSel} options={[{ v: "a", l: "Customer changed their mind" }, { v: "b", l: "Wrong size" }]} /></Field>
                        <TagEditor label="Tags" values={tags} onChange={setTags} placeholder="Add tag" />
                        <Qty value={qty} onChange={setQty} min={0} max={5} label="item" />
                    </div>
                </Card>
                <Card title="Choices" pad>
                    <div className="stack">
                        <Seg label="Period" value={seg} onChange={setSeg} options={[{ v: "today", l: "Today" }, { v: "7d", l: "7 days" }, { v: "30d", l: "30 days" }]} />
                        <div className="chips">{["all", "pack", "paid"].map(c => <Chip key={c} pressed={chip === c} onClick={() => setChip(c)} count={c === "all" ? null : 4}>{c}</Chip>)}</div>
                        <RadioCards label="Payment" value={rc} onChange={setRc} options={[
                            { v: "cash", title: "Cash", desc: "Counted into the drawer. No fee." },
                            { v: "link", title: "Send a pay link", desc: "Card or Mobile money." },
                            { v: "gift", title: "Gift card", desc: "Choose a customer first.", disabled: true },
                        ]} />
                        <SRow label="Charge for delivery" help="When off, delivery is free everywhere."><Switch label="Charge for delivery" checked={sw} onChange={setSw} /></SRow>
                    </div>
                </Card>
            </div>
            <Card title="Banners and badges" pad>
                <div className="stack">
                    <Banner tone="warn" title="WhatsApp credit is running low" actionLabel="Top up">About 2 days of messages left.</Banner>
                    <Banner tone="danger" title="We couldn't load orders">Nothing was changed.</Banner>
                    <Banner tone="ok" title="Payment confirmed">Paystack confirms the payment.</Banner>
                    <Banner tone="info" title="Waiting for Ama to pay">The items are held for 29:12.</Banner>
                    <Banner title="Turn on order alerts on this phone" />
                    <div className="hrow wrap">
                        <PayBadge s="paid" /><PayBadge s="unpaid" /><PayBadge s="refunded" /><PayBadge s="void" />
                        <FulBadge s="unfulfilled" /><FulBadge s="packed" /><FulBadge s="shipped" /><FulBadge s="partly" /><FulBadge s="delivered" pickup />
                        <Badge plain>Wholesale</Badge><Badge tone="info" plain>Includes pre-order</Badge>
                    </div>
                </div>
            </Card>
            <Card title="Sales by day">
                <div className="card-body" style={{ paddingTop: 0 }}>
                    <LineChart cur={[3120, 4480, 5910, 2650, 4020, 5480, 3860]} prev={[2810, 3990, 4620, 3010, 3550, 4310, 3120]} labels={["15", "16", "17", "18", "19", "20", "21"]} />
                </div>
            </Card>
            <Card title="List states">
                <BulkBar count={bulk} onClear={() => setBulk(0)}><Btn sm>Mark as packed</Btn><Btn sm icon="print">Print packing slips</Btn></BulkBar>
                <SkeletonRows n={2} />
                <ErrorState what="orders" onRetry={() => toast.info("Retrying")} />
                <Empty icon="check" title="You're all caught up" body="New orders to pack, payments to check, low stock and conversations that need a person will show up here." />
            </Card>
            <Card title="Overlays" pad>
                <div className="hrow wrap">
                    <Btn onClick={() => setPanel(true)}>Open panel</Btn>
                    <Btn onClick={() => setModal(true)}>Open modal</Btn>
                    <Btn kind="danger" onClick={() => setConfirm(true)}>Confirm panel</Btn>
                    <Btn onClick={() => setDirty(dirty ? 0 : 2)}>Toggle unsaved bar</Btn>
                </div>
            </Card>
            <UnsavedBar count={dirty} onDiscard={() => setDirty(0)} onSave={() => { setDirty(0); toast.success("2 changes saved"); }} />
            <Panel open={panel} onClose={() => setPanel(false)} wide title="Order MT-4830" sub="Ama Owusu · Today, 11:20 · Online"
                head={<div className="hrow-sm wrap" style={{ marginBottom: 6 }}><PayBadge s="paid" /><FulBadge s="unfulfilled" /></div>}
                tabs={[{ v: "d", l: "Details" }, { v: "t", l: "Timeline" }]} tab="d"
                footerLeft={<Btn kind="ghost" icon="refund">Refund</Btn>}
                footer={<><Btn kind="ghost" onClick={() => setPanel(false)}>Close</Btn><Btn kind="primary" onClick={() => setPanel2(true)}>Mark as packed</Btn></>}>
                <p className="ink2">Panels slide in from the right; under 620px they become a full-height sheet. Esc closes the top layer only.</p>
                <Field label="Staff notes" htmlFor="sn" help="Only your team sees this."><textarea id="sn" className="textarea" /></Field>
            </Panel>
            <Panel open={panel2} level={2} onClose={() => setPanel2(false)} title="Mark as packed" sub="Order MT-4830"
                footer={<><Btn kind="ghost" onClick={() => setPanel2(false)}>Cancel</Btn><Btn kind="primary" onClick={() => { setPanel2(false); toast.success("MT-4830 marked as packed"); }}>Mark 3 items as packed</Btn></>}>
                <p className="ink2">A second level, stacked on the first.</p>
            </Panel>
            <Modal open={modal} onClose={() => setModal(false)} title="Leave without saving?" footer={<><Btn kind="ghost" onClick={() => setModal(false)}>Keep editing</Btn><Btn kind="danger-solid" onClick={() => setModal(false)}>Discard 2 changes</Btn></>}>
                <p className="ink2">You have 2 unsaved changes in Settings.</p>
            </Modal>
            <ConfirmPanel open={confirm} onClose={() => setConfirm(false)} title="Cancel MT-GC-7Q2K" sub="For Adwoa Sika"
                consequenceTitle="GH₵ 500.00 can no longer be spent" consequence="The code stops working at checkout and the POS straight away. No money is refunded to the buyer."
                confirmLabel="Cancel gift card" cancelLabel="Keep gift card" onConfirm={() => { setConfirm(false); toast.success("Gift card cancelled"); }} />
        </>
    );
}
