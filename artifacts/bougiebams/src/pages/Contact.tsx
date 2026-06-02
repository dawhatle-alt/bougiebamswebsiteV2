import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Message Sent",
        description: "Thank you for reaching out. We will get back to you shortly.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-6xl mb-6">Get in Touch</h1>
          <p className="text-muted-foreground font-serif text-xl max-w-2xl mx-auto">
            Whether you have a question about an order, need styling advice, or just want to say hello, our concierge team is here for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
          {/* Contact Info */}
          <div className="space-y-10">
            <div>
              <h3 className="font-sans font-semibold tracking-widest uppercase text-xs text-primary mb-4">Email</h3>
              <a href="mailto:concierge@bougiebams.com" className="font-serif text-xl hover:text-primary transition-colors">
                concierge@bougiebams.com
              </a>
            </div>
            
            <div>
              <h3 className="font-sans font-semibold tracking-widest uppercase text-xs text-primary mb-4">Social</h3>
              <a href="#" className="font-serif text-xl hover:text-primary transition-colors block mb-2">
                @bougiebams on Instagram
              </a>
              <a href="#" className="font-serif text-xl hover:text-primary transition-colors block">
                @bougiebams on Pinterest
              </a>
            </div>

            <div>
              <h3 className="font-sans font-semibold tracking-widest uppercase text-xs text-primary mb-4">Hours</h3>
              <p className="font-serif text-xl text-muted-foreground">
                Monday - Friday<br />
                9am - 5pm EST
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Name</label>
                  <Input id="name" required className="h-12 rounded-none border-border bg-transparent focus-visible:ring-primary" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Email</label>
                  <Input id="email" type="email" required className="h-12 rounded-none border-border bg-transparent focus-visible:ring-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Subject</label>
                <select 
                  id="subject" 
                  className="flex h-12 w-full border border-border bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-none"
                  required
                >
                  <option value="" disabled selected>Select a topic</option>
                  <option value="order">Order Inquiry</option>
                  <option value="product">Product Question</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="press">Press & Media</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium tracking-wide uppercase text-muted-foreground">Message</label>
                <Textarea 
                  id="message" 
                  required 
                  className="min-h-[150px] rounded-none border-border bg-transparent focus-visible:ring-primary resize-y" 
                />
              </div>

              <Button 
                type="submit" 
                className="h-14 px-8 text-lg bg-foreground text-background hover:bg-primary rounded-none w-full sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
