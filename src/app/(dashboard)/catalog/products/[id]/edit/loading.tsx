export default function EditProductLoading() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-4 w-16 bg-neutral-200 rounded" />
                        <div className="h-4 w-2 bg-neutral-200 rounded" />
                        <div className="h-4 w-8 bg-neutral-200 rounded" />
                    </div>
                    <div className="h-9 w-48 bg-neutral-200 rounded mb-2" />
                    <div className="h-4 w-32 bg-neutral-200 rounded" />
                </div>
                <div className="flex items-center gap-3 md:mt-8 w-full md:w-auto">
                    <div className="h-11 w-24 bg-neutral-100 border border-neutral-200 rounded" />
                    <div className="h-11 w-36 bg-neutral-900 rounded" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info card */}
                    <div className="bg-white p-4 sm:p-8 border border-neutral-200 space-y-8">
                        <div className="h-4 w-36 bg-neutral-200 rounded border-b border-neutral-200 pb-4" />
                        <div className="space-y-2">
                            <div className="h-3 w-24 bg-neutral-200 rounded" />
                            <div className="h-8 w-full bg-neutral-100 rounded" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <div className="h-3 w-20 bg-neutral-200 rounded" />
                                <div className="h-8 w-full bg-neutral-100 rounded" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-28 bg-neutral-200 rounded" />
                                <div className="h-8 w-full bg-neutral-100 rounded" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 w-24 bg-neutral-200 rounded" />
                            <div className="h-24 w-full bg-neutral-100 rounded" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 w-10 bg-neutral-200 rounded" />
                            <div className="h-8 w-full bg-neutral-100 rounded" />
                        </div>
                    </div>

                    {/* Variants card */}
                    <div className="bg-white p-4 sm:p-8 border border-neutral-200 space-y-8">
                        <div className="h-4 w-20 bg-neutral-200 rounded" />
                        {["Sizes", "Colors", "Brands"].map(label => (
                            <div key={label} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="h-3 w-16 bg-neutral-200 rounded" />
                                    <div className="h-5 w-9 bg-neutral-200 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                    {/* Pricing card */}
                    <div className="bg-white p-4 sm:p-6 border border-neutral-200 space-y-6">
                        <div className="h-4 w-36 bg-neutral-200 rounded" />
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-2">
                                <div className="h-3 w-24 bg-neutral-200 rounded" />
                                <div className="h-8 w-full bg-neutral-100 rounded" />
                            </div>
                        ))}
                        <div className="h-16 w-full bg-neutral-100 rounded border border-neutral-200" />
                        <div className="h-16 w-full bg-neutral-100 rounded border border-neutral-200" />
                    </div>

                    {/* Media card */}
                    <div className="bg-white p-4 sm:p-6 border border-neutral-200 space-y-4">
                        <div className="h-4 w-28 bg-neutral-200 rounded" />
                        <div className="h-40 w-full bg-neutral-100 rounded border-2 border-dashed border-neutral-200" />
                    </div>
                </div>
            </div>
        </div>
    );
}
