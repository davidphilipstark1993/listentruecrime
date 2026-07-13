import { CsvImporter } from '@/components/admin/csv-importer'

export default function AdminImportPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Import CSV</h1>
        <p className="text-stone-subtle text-sm">
          Upload a CSV file to bulk-import or update podcasts. Existing slugs are updated, new slugs are inserted.
        </p>
      </div>
      <CsvImporter />
    </div>
  )
}
