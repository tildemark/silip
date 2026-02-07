import Link from "next/link"

export function Footer() {
    return (
        <footer className="border-t py-8 mt-auto bg-background">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                <div className="flex justify-center gap-6 mb-4">
                    <Link href="/terms" className="hover:text-foreground transition-colors">
                        Terms of Service
                    </Link>
                    <Link href="/privacy" className="hover:text-foreground transition-colors">
                        Privacy Policy
                    </Link>
                </div>
                <p>
                    SILIP - Searchable Interface for Legal Information & Privacy
                </p>
                <p className="mt-2">
                    &copy; {new Date().getFullYear()} Alfredo Sanchez Jr. All rights reserved.
                </p>
            </div>
        </footer>
    )
}
