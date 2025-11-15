import ContractorForm from '@/components/ContractorForm'

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              Locus Dashboard
            </h1>
            <nav className="flex space-x-4">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </a>
              <a href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Contractor Setup
          </h2>
          <p className="text-gray-600">
            Fill in your details to set up GitHub PR tracking and payment configuration
          </p>
        </div>

        {/* Dashboard Content Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Contractor Information
            </h3>
            <p className="text-sm text-gray-600">
              Fill in your details to set up GitHub PR tracking and payment configuration
            </p>
          </div>
          <ContractorForm />
        </div>
      </main>
    </div>
  )
}

