import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/ui";
export default function Settings() { return <><PageHeader title="Settings" description="Configure your StableHire workspace." /><Card className="max-w-2xl"><h2 className="mb-5 font-semibold">General</h2><div className="space-y-5"><label className="block text-sm"><span className="mb-2 block text-slate-400">Workspace name</span><input className="input" defaultValue="StableHire Workspace" /></label><label className="block text-sm"><span className="mb-2 block text-slate-400">API endpoint</span><input className="input" defaultValue="http://localhost:8000/api" /></label><button className="btn-primary">Save settings</button></div></Card></>; }

