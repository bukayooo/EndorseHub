import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ImportReviewsForm from './ImportReviewsForm'

const formSchema = z.object({
  authorName: z.string().min(2, 'Author name must be at least 2 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  rating: z.number().min(1).max(5).optional(),
})

type FormData = z.infer<typeof formSchema>

interface AddTestimonialFormProps {
  onSuccess?: () => void
}

export default function AddTestimonialForm({ onSuccess }: AddTestimonialFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      authorName: '',
      content: '',
      rating: 5,
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      setIsSubmitting(true)
      try {
        const response = await api.post('/api/testimonials', data)
        return response.data
      } finally {
        setIsSubmitting(false)
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Testimonial added successfully',
      })
      form.reset()
      onSuccess?.()
    },
    onError: (error) => {
      console.error('[AddTestimonialForm] Submit error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add testimonial',
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <Tabs defaultValue="manual" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manual">Add Manually</TabsTrigger>
        <TabsTrigger value="import">Import Reviews</TabsTrigger>
      </TabsList>
      
      <TabsContent value="manual">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="authorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your testimonial here..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating (1-5)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Testimonial'
              )}
            </Button>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="import">
        <ImportReviewsForm onSuccess={onSuccess} />
      </TabsContent>
    </Tabs>
  )
} 